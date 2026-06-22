import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessPolicyService } from './access-policy.service';

export interface HrContextResult {
  handled: boolean;
  refused: boolean;
  context?: string;
  reason?: string;
}

@Injectable()
export class HrContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async build(question: string, user: AuthenticatedUser): Promise<HrContextResult> {
    const normalized = this.normalize(question);
    const topic = this.detectTopic(normalized);
    if (!topic) return { handled: false, refused: false };

    if (topic === 'headcount') {
      if (!this.accessPolicy.canUseOrganizationAggregates(user.role)) {
        return { handled: true, refused: true, reason: 'Organization analytics are not available for your role.' };
      }
      return this.buildAggregateContext(user, topic);
    }

    if (topic === 'wellbeing-aggregate') {
      if (!this.accessPolicy.canUseOrganizationAggregates(user.role)) {
        return { handled: true, refused: true, reason: 'Organization analytics are not available for your role.' };
      }
      return this.buildAggregateContext(user, topic);
    }

    if (topic === 'organization') {
      const actor = await this.accessPolicy.getActor(user);
      if (!this.accessPolicy.isGlobalHr(user.role) && user.role !== 'MANAGER') {
        return {
          handled: true,
          refused: true,
          reason: 'Organization structure is available only to HR, Admin, and managers for their own teams.',
        };
      }
      const managers = await this.prisma.employee.findMany({
        where:
          user.role === 'MANAGER'
            ? { id: actor?.id ?? 'none' }
            : { reports: { some: {} }, status: { not: 'INACTIVE' } },
        select: {
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
          reports: {
            where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true,
              position: { select: { title: true } },
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return {
        handled: true,
        refused: false,
        context: JSON.stringify({
          scope: user.role === 'MANAGER' ? 'own direct reports' : 'organization',
          managers: managers.map((manager) => ({
            manager: `${manager.firstName} ${manager.lastName}`,
            employeeNumber: manager.employeeNumber,
            department: manager.department?.name,
            position: manager.position?.title,
            teamSize: manager.reports.length,
            directReports: manager.reports.map((report) => ({
              employee: `${report.firstName} ${report.lastName}`,
              employeeNumber: report.employeeNumber,
              position: report.position?.title,
            })),
          })),
        }),
      };
    }

    if (
      topic === 'salary' &&
      /\b(all|every|employees|salaries|salary grid|pay band|tous|employes|salaires|liste|grille salariale)\b/.test(normalized)
    ) {
      if (!this.accessPolicy.isGlobalHr(user.role)) {
        return { handled: true, refused: true, reason: 'Only HR and Admin can access employee salary lists.' };
      }
      const department = await this.findMentionedDepartment(normalized);
      const employees = await this.prisma.employee.findMany({
        where: {
          status: { not: 'INACTIVE' },
          ...(department ? { departmentId: department.id } : {}),
        },
        select: {
          firstName: true,
          lastName: true,
          employeeNumber: true,
          salary: true,
          department: { select: { name: true } },
          position: { select: { title: true, level: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return {
        handled: true,
        refused: false,
        context: JSON.stringify({
          scope: department ? `department ${department.name}` : 'organization',
          salaries: employees.map((employee) => ({
            employee: `${employee.firstName} ${employee.lastName}`,
            employeeNumber: employee.employeeNumber,
            department: employee.department?.name,
            position: employee.position?.title,
            level: employee.position?.level,
            salary: Number(employee.salary),
            currency: 'MAD',
          })),
        }),
      };
    }

    if (
      topic === 'requests' &&
      /\b(pending|attente|approval|approbation|valider|all|team|equipe|liste|toutes|tous)\b/.test(normalized)
    ) {
      const actor = await this.accessPolicy.getActor(user);
      const where =
        this.accessPolicy.isGlobalHr(user.role)
          ? {}
          : user.role === 'MANAGER' && actor
            ? { employee: { managerId: actor.id } }
            : actor
              ? { employeeId: actor.id }
              : { id: 'none' };
      const requests = await this.prisma.hrRequest.findMany({
        where: {
          ...where,
          ...(normalized.includes('pending') || normalized.includes('attente')
            ? { status: 'PENDING' as const }
            : {}),
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
          template: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return {
        handled: true,
        refused: false,
        context: JSON.stringify({
          requests: requests.map((request) => ({
            id: request.id,
            employee: `${request.employee.firstName} ${request.employee.lastName}`,
            employeeNumber: request.employee.employeeNumber,
            kind: request.kind,
            type: request.requestType,
            status: request.status,
            createdAt: request.createdAt,
            template: request.template?.title,
          })),
        }),
      };
    }

    if (
      topic === 'documents' &&
      (
        /\b(template|templates|modele|modeles|available|disponible)\b/.test(normalized) ||
        /\bcan i request|can be made|peut demander|peuvent etre demandes\b/.test(normalized)
      )
    ) {
      const templates = await this.prisma.documentTemplate.findMany({
        where: { isActive: true },
        select: { id: true, title: true, documentType: true, category: true, description: true },
        orderBy: { title: 'asc' },
      });
      return {
        handled: true,
        refused: false,
        context: JSON.stringify({ availableDocumentTemplates: templates }),
      };
    }

    const target = await this.resolveTargetEmployee(normalized, user);
    if (!target) {
      return {
        handled: true,
        refused: true,
        reason: 'I could not identify an employee you are authorized to query.',
      };
    }

    const policyTopic =
      topic === 'salary'
        ? 'salary'
        : topic === 'documents'
          ? 'documents'
          : topic === 'requests'
            ? 'requests'
            : topic === 'performance'
              ? 'wellbeing'
              : 'profile';
    const allowed = await this.accessPolicy.canAccessEmployee(user, target.id, policyTopic);
    if (!allowed) {
      return {
        handled: true,
        refused: true,
        reason: 'You are not authorized to access that employee information.',
      };
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: target.id },
      include: {
        department: true,
        position: true,
        manager: { select: { firstName: true, lastName: true } },
        requests: { orderBy: { createdAt: 'desc' }, take: 10, include: { template: true } },
        absences: { orderBy: { startDate: 'desc' }, take: 10 },
        workflowTasks: {
          where: { workflowType: 'ONBOARDING' },
          orderBy: { stepOrder: 'asc' },
        },
        generatedDocs: { orderBy: { generatedAt: 'desc' }, take: 10 },
        hrDocuments: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!employee) return { handled: true, refused: true, reason: 'Employee not found.' };

    const name = `${employee.firstName} ${employee.lastName}`;
    let data: Record<string, unknown>;
    switch (topic) {
      case 'salary':
        data = { employee: name, salary: Number(employee.salary), currency: 'MAD' };
        break;
      case 'leave':
        data = {
          employee: name,
          vacationBalanceDays: employee.vacationBalanceDays,
          rttBalanceDays: employee.rttBalanceDays,
          recentAbsences: employee.absences,
          recentLeaveRequests: employee.requests.filter((request) => request.kind === 'VACATION'),
        };
        break;
      case 'requests':
        data = { employee: name, requests: employee.requests };
        break;
      case 'documents':
        data = {
          employee: name,
          approvedDocuments: employee.hrDocuments.map((doc) => ({
            title: doc.title,
            type: doc.documentType,
            category: doc.category,
            status: doc.status,
          })),
          generatedDocuments: employee.generatedDocs.map((doc) => ({
            type: doc.documentType,
            status: doc.status,
            generatedAt: doc.generatedAt,
          })),
          documentRequests: employee.requests
            .filter((request) => request.kind === 'DOCUMENT')
            .map((request) => ({
              type: request.requestType,
              status: request.status,
              createdAt: request.createdAt,
              comment: request.comment,
            })),
        };
        break;
      case 'onboarding':
        data = { employee: name, onboardingTasks: employee.workflowTasks };
        break;
      case 'performance':
        data = {
          employee: name,
          engagementScore: employee.engagementScore,
          presenceScore: employee.presenceScore,
          performanceScore: employee.performanceScore,
        };
        break;
      default:
        data = {
          employee: name,
          employeeNumber: employee.employeeNumber,
          email: employee.email,
          phone: employee.phone,
          location: employee.location,
          department: employee.department?.name,
          position: employee.position?.title,
          manager: employee.manager
            ? `${employee.manager.firstName} ${employee.manager.lastName}`
            : null,
          hireDate: employee.hireDate,
          status: employee.status,
          skills: employee.skills,
        };
    }
    return { handled: true, refused: false, context: JSON.stringify(data, null, 2) };
  }

  private async buildAggregateContext(user: AuthenticatedUser, topic: string): Promise<HrContextResult> {
    const actor = await this.accessPolicy.getActor(user);
    const where =
      user.role === 'MANAGER' && actor
        ? { managerId: actor.id }
        : {};
    const employees = await this.prisma.employee.findMany({
      where: { ...where, status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: {
        id: true,
        engagementScore: true,
        presenceScore: true,
        performanceScore: true,
      },
    });
    if (topic === 'headcount') {
      return {
        handled: true,
        refused: false,
        context: JSON.stringify({ headcount: employees.length, scope: user.role === 'MANAGER' ? 'direct reports' : 'organization' }),
      };
    }
    const average = (key: 'engagementScore' | 'presenceScore' | 'performanceScore') =>
      employees.length
        ? Math.round(employees.reduce((sum, employee) => sum + employee[key], 0) / employees.length)
        : 0;
    const employeeIds = employees.map((employee) => employee.id);
    const absenceDays = await this.prisma.absence.aggregate({
      where: { employeeId: { in: employeeIds }, status: 'APPROVED' },
      _sum: { durationDays: true },
    });
    return {
      handled: true,
      refused: false,
      context: JSON.stringify({
        scope: user.role === 'MANAGER' ? 'direct reports' : 'organization',
        employeeCount: employees.length,
        averageEngagement: average('engagementScore'),
        averagePresence: average('presenceScore'),
        averagePerformance: average('performanceScore'),
        approvedAbsenceDays: Number(absenceDays._sum.durationDays ?? 0),
      }),
    };
  }

  private async resolveTargetEmployee(normalizedQuestion: string, user: AuthenticatedUser) {
    const actor = await this.accessPolicy.getActor(user);
    if (/\b(my|me|mine|mon|ma|mes|moi|je|انا|لي)\b/.test(normalizedQuestion)) {
      return actor;
    }

    const employees = await this.prisma.employee.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const matches = employees.filter((employee) => {
      const fullName = this.normalize(`${employee.firstName} ${employee.lastName}`);
      return (
        normalizedQuestion.includes(fullName) ||
        normalizedQuestion.includes(this.normalize(employee.email))
      );
    });
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;
    const partialMatches = employees.filter(
      (employee) =>
        normalizedQuestion.includes(this.normalize(employee.firstName)) ||
        normalizedQuestion.includes(this.normalize(employee.lastName)),
    );
    if (partialMatches.length === 1) return partialMatches[0];
    if (partialMatches.length > 1) return null;
    if (user.role === 'COLLABORATOR') return actor;
    return actor;
  }

  private detectTopic(question: string) {
    if (/\b(salary|salaries|salary grid|pay band|salaire|salaires|grille salariale|paie|compensation|earn|earns|make|makes|gagne|راتب)\b/.test(question)) return 'salary';
    if (/\b(manager|managers|team|teams|team size|direct reports|org chart|organization chart|reporting line|equipe|equipes|organigramme|hierarchie)\b/.test(question)) return 'organization';
    if (/\b(headcount|effectif|nombre d.employ|workforce)\b/.test(question)) return 'headcount';
    if (/\b(absenteeism|absenteisme|engagement global|presence globale|wellbeing|bien.etre)\b/.test(question)) return 'wellbeing-aggregate';
    if (/\b(vacation|leave|conge|conges|rtt|absence|absences|solde)\b/.test(question)) return 'leave';
    if (/\b(request|requests|demande|demandes|approval|approbation|pending|attente)\b/.test(question)) return 'requests';
    if (/\b(document|documents|attestation|bulletin|certificate|certificat)\b/.test(question)) return 'documents';
    if (/\b(onboarding|integration|step|etape|task|tache)\b/.test(question)) return 'onboarding';
    if (/\b(performance|engagement|presence|score|rendement)\b/.test(question)) return 'performance';
    if (/\b(profile|profil|department|departement|position|poste|manager|skills|competences|employee|employe)\b/.test(question)) return 'profile';
    return null;
  }

  private async findMentionedDepartment(normalizedQuestion: string) {
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    return departments.find((department) =>
      normalizedQuestion.includes(this.normalize(department.name)),
    );
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
