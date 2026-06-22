import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async getScopeFilter(user: AuthenticatedUser) {
    if (user.role === 'ADMIN' || user.role === 'HR' || user.role === 'DIRECTION' || user.role === 'QVT') {
      return {}; // Global access
    }

    const employee = await this.prisma.employee.findUnique({
      where: { email: user.email },
      include: { department: true }
    });

    if (!employee) {
      return { id: 'none' }; // Failsafe
    }

    if (user.role === 'MANAGER') {
      return { managerId: employee.id };
    }

    // COLLABORATOR or others
    return { id: employee.id };
  }

  async headcount(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const totalEmployees = await this.prisma.employee.count({
      where: { ...scope, status: { in: ['ACTIVE', 'ONBOARDING'] } },
    });
    return {
      headcount: totalEmployees,
      note: 'Total active employees',
    };
  }

  async absenteeism(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const absenceScope = this.relatedEmployeeScope(scope);

    // Absences réelles non planifiées (Maladie, etc.)
    const trueAbsences = await this.prisma.absence.findMany({
      where: {
        ...absenceScope,
        absenceType: { notIn: ['Congés payés', 'RTT', 'Congé', 'Vacation', 'Congés'] }
      }
    });

    const totalUnplannedDays = trueAbsences.reduce((sum, abs) => sum + Number(abs.durationDays || 0), 0);

    // Toutes les absences (pour l'affichage brut)
    const allAbsences = await this.prisma.absence.findMany({ where: absenceScope });
    const totalAbsencesDays = allAbsences.reduce((sum, abs) => sum + Number(abs.durationDays || 0), 0);

    const pendingLeaves = await this.prisma.hrRequest.count({
      where: { ...absenceScope, kind: 'VACATION', status: 'PENDING' },
    });
    
    const totalEmployees = await this.prisma.employee.count({
      where: { ...scope, status: { in: ['ACTIVE', 'ONBOARDING'] } },
    });
    
    const rate = totalEmployees > 0 ? ((totalUnplannedDays / (totalEmployees * 20)) * 100).toFixed(1) : 0;

    return {
      rate: Number(rate),
      totalAbsences: Math.round(totalAbsencesDays),
      pendingLeaves,
      note: 'Computed correctly based on days absent',
    };
  }

  async turnover(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const total = await this.prisma.employee.count({ where: scope });
    const departures = await this.prisma.employee.count({
      where: { ...scope, status: { in: ['OFFBOARDING', 'INACTIVE'] } },
    });
    return {
      rate: total ? Number(((departures / total) * 100).toFixed(1)) : 0,
      departures,
      population: total,
    };
  }

  async onboardingProgress(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const taskScope = this.relatedEmployeeScope(scope);

    const steps = await this.prisma.workflowTask.findMany({
      where: { ...taskScope, workflowType: 'ONBOARDING' },
    });
    if (steps.length === 0) return { averageProgress: 0, note: 'No onboarding tasks found' };

    const completed = steps.filter((s: any) => s.completedAt !== null).length;
    const progress = Math.round((completed / steps.length) * 100);

    return {
      averageProgress: progress,
      note: 'Computed from WorkflowTask table',
    };
  }

  async aiUsage(_user: AuthenticatedUser) {
    const questionsAsked = await this.prisma.aiMessage.count({ where: { role: 'USER' } });
    const generatedDrafts = await this.prisma.generatedDocument.count();

    return {
      questionsAsked,
      refusals: await this.prisma.aiMessage.count({ where: { safetyStatus: 'BLOCKED' } }),
      generatedDrafts,
    };
  }

  async alertsSummary(_user: AuthenticatedUser) {
    const open = await this.prisma.securityAlert.count({ where: { status: 'OPEN' } });
    const investigating = await this.prisma.securityAlert.count({ where: { status: 'INVESTIGATING' } });
    const resolved = await this.prisma.securityAlert.count({ where: { status: 'RESOLVED' } });

    return { open, investigating, resolved };
  }

  async hrAlerts(_user: AuthenticatedUser) {
    const alerts = await this.prisma.securityAlert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { status: { in: ['OPEN', 'INVESTIGATING'] } },
    });

    if (alerts.length === 0) {
      return [];
    }

    return alerts.map((a: any) => ({
      id: a.id,
      title: a.alertType,
      description: `Sévérité : ${a.severity}`,
      type: a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'danger' : 'warning',
    }));
  }

  async hiringData(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const employees = await this.prisma.employee.findMany({
      where: { ...scope, hireDate: { not: undefined } },
      select: { hireDate: true },
    });

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    const stats = months.map((month) => ({ month, recrues: 0 }));

    employees.forEach((emp: any) => {
      if (emp.hireDate) {
        const d = new Date(emp.hireDate);
        if (d.getFullYear() === currentYear) {
          stats[d.getMonth()].recrues += 1;
        }
      }
    });

    const currentMonth = new Date().getMonth();
    let startMonth = currentMonth - 5;
    if (startMonth < 0) startMonth = 0;

    return stats.slice(startMonth, currentMonth + 1).length > 0
      ? stats.slice(startMonth, currentMonth + 1)
      : stats.slice(0, 6);
  }

  async teamMembers(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const today = new Date();
    
    const employees = await this.prisma.employee.findMany({
      where: { ...scope, status: { not: 'INACTIVE' } },
      include: {
        department: true,
        position: true,
        absences: {
          where: {
            status: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today }
          }
        }
      }
    });

    // Map to include a dynamic 'isOnLeave' boolean based on current absences
    return employees.map(({ salary: _salary, address: _address, ...employee }) => ({
      ...employee,
      isOnLeave: employee.absences && employee.absences.length > 0
    }));
  }

  async teamPerf(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const employees = await this.prisma.employee.findMany({
      where: { ...scope, status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: { presenceScore: true, performanceScore: true, engagementScore: true }
    });

    if (employees.length === 0) {
      return [
        { subject: 'Engagement', A: 0 },
        { subject: 'Présence', A: 0 },
        { subject: 'Performance', A: 0 },
      ];
    }

    const avgPresence = Math.round(employees.reduce((acc, e) => acc + e.presenceScore, 0) / employees.length);
    const avgPerf = Math.round(employees.reduce((acc, e) => acc + e.performanceScore, 0) / employees.length);
    const avgEngage = Math.round(employees.reduce((acc, e) => acc + e.engagementScore, 0) / employees.length);

    return [
      { subject: 'Engagement', A: avgEngage },
      { subject: 'Présence', A: avgPresence },
      { subject: 'Performance', A: avgPerf },
      { subject: 'Autonomie', A: Math.round((avgPerf + avgEngage) / 2) },
      { subject: 'Collaboration', A: Math.round((avgEngage + 90) / 2) },
      { subject: 'Qualité', A: avgPerf },
    ];
  }

  async weeklyOutput(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const employees = await this.prisma.employee.findMany({
      where: scope,
      select: { id: true }
    });
    const employeeIds = employees.map(e => e.id);

    if (employeeIds.length === 0) {
      return [
        { day: 'Lun', tasks: 0 }, { day: 'Mar', tasks: 0 }, { day: 'Mer', tasks: 0 },
        { day: 'Jeu', tasks: 0 }, { day: 'Ven', tasks: 0 },
      ];
    }

    const tasks = await this.prisma.workflowTask.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'DONE',
        completedAt: { not: null }
      }
    });

    const requests = await this.prisma.hrRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        reviewedAt: { not: null }
      }
    });

    const counts = [0, 0, 0, 0, 0]; // Lun, Mar, Mer, Jeu, Ven

    tasks.forEach(t => {
      const day = t.completedAt!.getDay(); // 0 is Sunday, 1 is Monday
      if (day >= 1 && day <= 5) counts[day - 1]++;
    });

    requests.forEach(r => {
      const day = r.reviewedAt!.getDay();
      if (day >= 1 && day <= 5) counts[day - 1]++;
    });

    return [
      { day: 'Lun', tasks: counts[0] },
      { day: 'Mar', tasks: counts[1] },
      { day: 'Mer', tasks: counts[2] },
      { day: 'Jeu', tasks: counts[3] },
      { day: 'Ven', tasks: counts[4] },
    ];
  }

  async presenceData(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    
    const employees = await this.prisma.employee.findMany({
      where: scope,
      select: { id: true, hireDate: true }
    });

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const result = [];

    // On parcourt les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const monthIndex = targetDate.getMonth();
      const nextMonth = new Date(year, monthIndex + 1, 1);

      let totalDaysWorked = 0;
      let validEmployees = 0;

      for (const emp of employees) {
        // Ignorer si l'employé n'était pas encore embauché
        if (emp.hireDate >= nextMonth) continue;
        validEmployees++;

        let workingDays = 21; // Base de jours ouvrés

        // Trouver les absences validées sur ce mois
        const absences = await this.prisma.absence.findMany({
          where: {
            employeeId: emp.id,
            status: 'APPROVED',
            startDate: { lt: nextMonth },
            endDate: { gte: targetDate }
          }
        });

        let absenceDays = 0;
        for (const abs of absences) {
          absenceDays += Number(abs.durationDays || 0);
        }

        let days = workingDays - Math.round(absenceDays);
        if (days < 0) days = 0;
        if (days > 23) days = 23;
        totalDaysWorked += days;
      }

      const avgJours = validEmployees > 0 ? Math.round(totalDaysWorked / validEmployees) : 0;

      result.push({
        month: monthNames[monthIndex],
        jours: avgJours
      });
    }

    return result;
  }

  async recentActivities(user: AuthenticatedUser) {
    const filter = user.role === 'ADMIN' || user.role === 'HR' ? {} : { userId: user.userId };
    const logs = await this.prisma.auditLog.findMany({
      where: filter,
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) {
      return [{ type: 'info', text: "Aucune activité récente", time: "À l'instant" }];
    }

    return logs.map((log: any) => {
      let type = 'info';
      if (log.action.includes('CREATE') || log.status === 'SUCCESS') type = 'approved';
      if (log.action.includes('DELETE') || log.status === 'DENIED') type = 'alert';

      return {
        type,
        text: `${log.action} sur ${log.resourceType}`,
        time: log.createdAt.toISOString().split('T')[0],
      };
    });
  }

  async recentRequests(user: AuthenticatedUser) {
    const scope = await this.getScopeFilter(user);
    const requestScope = this.relatedEmployeeScope(scope);

    const requests = await this.prisma.hrRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: { ...requestScope },
      include: { employee: true },
    });
    return requests.map((r: any) => ({
      id: r.id,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      type: r.requestType,
      date: r.startDate ? r.startDate.toISOString().split('T')[0] : r.createdAt.toISOString().split('T')[0],
      status: r.status.toLowerCase(),
    }));
  }

  async departmentDistribution(_user: AuthenticatedUser) {
    const departments = await this.prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: {
              where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      value: department._count.employees,
    }));
  }

  private relatedEmployeeScope(scope: Record<string, unknown>) {
    if ('id' in scope) return { employeeId: scope.id as string };
    return Object.keys(scope).length ? { employee: scope } : {};
  }
}
