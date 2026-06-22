import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiActionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { EmployeesService } from '../employees/employees.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { AuditService } from '../audit/audit.service';
import { LlmMessage, LlmService } from '../../services/llm/llm.service';

@Injectable()
export class ChatActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    private readonly onboardingService: OnboardingService,
    private readonly auditService: AuditService,
    private readonly llmService: LlmService,
  ) {}

  async propose(
    question: string,
    conversationId: string,
    user: AuthenticatedUser,
    history: LlmMessage[] = [],
  ) {
    const normalized = this.normalize(question);
    const selfServiceProposal = await this.proposeSelfServiceAction(
      question,
      conversationId,
      user,
      history,
    );
    if (selfServiceProposal) return selfServiceProposal;
    const reviewProposal = await this.proposeReview(normalized, conversationId, user);
    if (reviewProposal) return reviewProposal;
    return this.proposeOnboarding(normalized, conversationId, user);
  }

  async confirm(id: string, user: AuthenticatedUser, attachment?: Express.Multer.File) {
    const draft = await this.prisma.aiActionDraft.findUnique({ where: { id } });
    if (!draft || draft.createdBy !== user.userId) {
      throw new NotFoundException('Action draft not found');
    }
    if (draft.status !== 'PENDING') {
      throw new ConflictException('This action draft has already been used');
    }
    if (draft.expiresAt <= new Date()) {
      await this.prisma.aiActionDraft.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw new ConflictException('This action draft has expired');
    }

    const payload = draft.payload as Record<string, any>;
    try {
      let result: unknown;
      switch (draft.actionType) {
        case 'CREATE_LEAVE_REQUEST':
          await this.validateLeaveRequest(user, payload);
          result = await this.employeesService.createVacationRequest(user.email, payload, attachment);
          break;
        case 'CREATE_DOCUMENT_REQUEST':
          result = await this.employeesService.createDocumentRequest(user.userId, {
            templateId: String(payload.templateId),
            note: payload.note ? String(payload.note) : undefined,
          });
          break;
        case 'REVIEW_HR_REQUEST':
          await this.assertCanReview(String(payload.requestId), user);
          result = await this.employeesService.updateRequestStatus(
            String(payload.requestId),
            payload.status,
            user,
            payload.comment,
          );
          break;
        case 'COMPLETE_ONBOARDING_STEP':
          result = await this.onboardingService.completeStep(
            String(payload.stepId),
            { note: payload.note },
            user,
          );
          break;
        default:
          throw new BadRequestException('Unsupported action type');
      }

      const updated = await this.prisma.aiActionDraft.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          executedAt: new Date(),
          result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        },
      });
      await this.auditService.log(
        user.userId,
        'AI_ACTION_CONFIRMED',
        'AiActionDraft',
        id,
        'SUCCESS',
        { actionType: draft.actionType },
      );
      return updated;
    } catch (error) {
      await this.prisma.aiActionDraft.update({
        where: { id },
        data: {
          status: 'FAILED',
          result: { error: error instanceof Error ? error.message : 'Action failed' },
        },
      });
      throw error;
    }
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const result = await this.prisma.aiActionDraft.updateMany({
      where: { id, createdBy: user.userId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (result.count === 0) throw new NotFoundException('Pending action draft not found');
    return { id, status: 'CANCELLED' };
  }

  private async proposeSelfServiceAction(
    question: string,
    conversationId: string,
    user: AuthenticatedUser,
    history: LlmMessage[],
  ) {
    const templates = await this.prisma.documentTemplate.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        documentType: true,
        description: true,
      },
    });
    const detected = await this.llmService.detectSelfServiceAction({
      question,
      history,
      templates,
      currentDate: new Date().toISOString().slice(0, 10),
    });
    if (detected.type === 'NONE') return null;
    if (detected.type === 'CREATE_DOCUMENT_REQUEST') {
      const template = templates.find((item) => item.id === detected.templateId);
      if (!template) return null;
      return this.createDraft(
        conversationId,
        user.userId,
        'CREATE_DOCUMENT_REQUEST',
        {
          templateId: template.id,
          note: detected.note || 'Requested through ARIA',
        },
        `Request the document "${template.title}"`,
      );
    }
    if (!detected.startDate || !detected.endDate) return null;
    const startDate = new Date(`${detected.startDate}T00:00:00`);
    const endDate = new Date(`${detected.endDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw new BadRequestException('The leave dates are invalid');
    }
    const durationDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );
    const normalizedLeaveType = this.normalize(detected.leaveType ?? '');
    const sickness =
      normalizedLeaveType.includes('maladie') ||
      normalizedLeaveType.includes('sick') ||
      normalizedLeaveType.includes('medical');
    return this.createDraft(
      conversationId,
      user.userId,
      'CREATE_LEAVE_REQUEST',
      {
        type: normalizedLeaveType.includes('rtt')
          ? 'RTT'
          : sickness
            ? 'Congé maladie'
            : 'Conges payes',
        startDate: detected.startDate,
        endDate: detected.endDate,
        durationDays,
        reason: detected.reason || 'Requested through ARIA',
        allowsAttachment: sickness,
      },
      `Create a ${durationDays}-day ${sickness ? 'sick ' : ''}leave request from ${detected.startDate} to ${detected.endDate}`,
    );
  }

  private async proposeReview(question: string, conversationId: string, user: AuthenticatedUser) {
    const approving = /\b(approve|accept|approuve|accepte|valide)\b/.test(question);
    const rejecting = /\b(reject|refuse|rejette)\b/.test(question);
    if (!approving && !rejecting) return null;
    if (!['ADMIN', 'HR', 'MANAGER'].includes(user.role)) return null;
    const id = question.match(/\b[a-z0-9]{20,30}\b/)?.[0];
    if (!id) return null;
    const status = approving ? 'APPROVED' : 'REJECTED';
    return this.createDraft(
      conversationId,
      user.userId,
      'REVIEW_HR_REQUEST',
      {
        requestId: id,
        status,
        comment: rejecting ? 'Rejected through ARIA' : undefined,
      },
      `${status === 'APPROVED' ? 'Approve' : 'Reject'} HR request ${id}`,
    );
  }

  private async proposeOnboarding(question: string, conversationId: string, user: AuthenticatedUser) {
    if (!/\b(complete|finish|done|termine|completer)\b/.test(question) || !/onboarding|integration|step|etape/.test(question)) {
      return null;
    }
    const id = question.match(/\b[a-z0-9]{20,30}\b/)?.[0];
    if (!id) return null;
    return this.createDraft(
      conversationId,
      user.userId,
      'COMPLETE_ONBOARDING_STEP',
      { stepId: id, note: 'Completed through ARIA' },
      `Complete onboarding step ${id}`,
    );
  }

  private async createDraft(
    conversationId: string,
    createdBy: string,
    actionType: AiActionType,
    payload: Record<string, unknown>,
    summary: string,
  ) {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const draft = await this.prisma.aiActionDraft.create({
      data: {
        conversationId,
        createdBy,
        actionType,
        payload: payload as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    return {
      id: draft.id,
      type: actionType,
      summary,
      payload,
      expiresAt,
    };
  }

  private async assertCanReview(requestId: string, user: AuthenticatedUser) {
    const request = await this.prisma.hrRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!request) throw new NotFoundException('HR request not found');
    if (request.status !== 'PENDING') throw new ConflictException('The request is no longer pending');
    if (request.kind === 'VACATION' && request.durationDays) {
      const employee = await this.prisma.employee.findUnique({ where: { id: request.employeeId } });
      if (!employee) throw new NotFoundException('Employee not found');
      const duration = Number(request.durationDays);
      const type = this.normalize(request.requestType);
      if (type === 'rtt' && duration > employee.rttBalanceDays) {
        throw new ConflictException('Insufficient RTT balance');
      }
      if (type !== 'rtt' && duration > employee.vacationBalanceDays) {
        throw new ConflictException('Insufficient vacation balance');
      }
      if (request.startDate && request.endDate) {
        const overlaps = await this.prisma.absence.count({
          where: {
            employeeId: request.employeeId,
            status: 'APPROVED',
            startDate: { lte: request.endDate },
            endDate: { gte: request.startDate },
          },
        });
        if (overlaps > 0) throw new ConflictException('The leave overlaps an approved absence');
      }
    }
    if (user.role === 'ADMIN' || user.role === 'HR') return;
    if (user.role !== 'MANAGER') throw new ForbiddenException('You cannot review HR requests');
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (!actor || request.employee.managerId !== actor.id) {
      throw new ForbiddenException('You can only review requests from direct reports');
    }
  }

  private async validateLeaveRequest(user: AuthenticatedUser, payload: Record<string, any>) {
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');
    const startDate = new Date(String(payload.startDate));
    const endDate = new Date(String(payload.endDate));
    const durationDays = Number(payload.durationDays);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate ||
      !Number.isFinite(durationDays) ||
      durationDays <= 0
    ) {
      throw new BadRequestException('Invalid leave dates or duration');
    }
    const type = this.normalize(String(payload.type));
    if (type === 'rtt' && durationDays > employee.rttBalanceDays) {
      throw new ConflictException('Insufficient RTT balance');
    }
    if (type !== 'rtt' && durationDays > employee.vacationBalanceDays) {
      throw new ConflictException('Insufficient vacation balance');
    }
    const overlappingRequests = await this.prisma.hrRequest.count({
      where: {
        employeeId: employee.id,
        kind: 'VACATION',
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    const overlappingAbsences = await this.prisma.absence.count({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlappingRequests > 0 || overlappingAbsences > 0) {
      throw new ConflictException('The requested dates overlap an existing request or absence');
    }
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

}
