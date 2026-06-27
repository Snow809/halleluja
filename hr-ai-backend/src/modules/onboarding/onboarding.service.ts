import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { GenerateOnboardingPlanDto } from './dto/generate-onboarding-plan.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivateWorkflowDto } from './dto/activate-workflow.dto';
import { GeneratedWorkflowTask, LlmService } from '../../services/llm/llm.service';

type WorkflowType = 'ONBOARDING' | 'OFFBOARDING';
type WorkflowAssignee = 'EMPLOYEE' | 'MANAGER' | 'HR';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly llmService: LlmService,
  ) {}

  generate(dto: GenerateOnboardingPlanDto, user: AuthenticatedUser) {
    return this.activate({ ...dto, workflowType: 'ONBOARDING' }, user);
  }

  async activate(dto: ActivateWorkflowDto, user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: {
        user: true,
        department: true,
        position: true,
        manager: { include: { user: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.workflowTask.count({
      where: {
        employeeId: employee.id,
        workflowType: dto.workflowType,
        status: { not: 'DONE' },
      },
    });
    if (existing > 0) {
      throw new ConflictException(`An active ${dto.workflowType.toLowerCase()} plan already exists`);
    }

    const generatedTasks = await this.generateTasksOrFail(dto.workflowType, employee);
    const tasks = this.validateGeneratedTasks(generatedTasks);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const actorEmployee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const employeeStatus = dto.workflowType === 'ONBOARDING' ? 'ONBOARDING' : 'OFFBOARDING';
    const onboardingState = dto.workflowType === 'ONBOARDING' ? 'ON' : 'OFFBOARDING';

    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id: employee.id },
        data: { status: employeeStatus },
      }),
      ...(employee.userId
        ? [
            this.prisma.user.update({
              where: { id: employee.userId },
              data: { onboardingState },
            }),
          ]
        : []),
      ...tasks.map((task, index) => {
        const dueDate = new Date(startsAt);
        dueDate.setDate(dueDate.getDate() + task.dueOffsetDays);
        return this.prisma.workflowTask.create({
          data: {
            employeeId: employee.id,
            assignedTo: this.resolveAssignee(task.assignee, employee, actorEmployee?.id),
            workflowType: dto.workflowType,
            phase: task.phase,
            stepOrder: index + 1,
            title: task.title,
            description: task.description,
            dueDate,
            locked: index > 0,
          },
        });
      }),
    ]);

    if (employee.userId) {
      await this.notifications.create({
        userId: employee.userId,
        type: 'ONBOARDING',
        title: dto.workflowType === 'ONBOARDING' ? 'Parcours onboarding créé' : 'Parcours offboarding créé',
        message:
          dto.workflowType === 'ONBOARDING'
            ? 'Votre parcours onboarding est maintenant disponible.'
            : 'Votre parcours offboarding est maintenant disponible.',
        resourceType: 'Employee',
        resourceId: employee.id,
      });
    }
    return this.findOne(employee.id, dto.workflowType);
  }

  async findAll(workflowType?: WorkflowType) {
    const employees = await this.prisma.employee.findMany({
      where: { workflowTasks: { some: workflowType ? { workflowType } : {} } },
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        workflowTasks: {
          where: workflowType ? { workflowType } : undefined,
          orderBy: { stepOrder: 'asc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    return employees.map((employee) => this.mapPlan(employee));
  }

  async findOne(employeeId: string, workflowType?: WorkflowType) {
    const selectedWorkflowType = workflowType ?? await this.resolveCurrentWorkflowType(employeeId);
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        workflowTasks: {
          where: { workflowType: selectedWorkflowType },
          orderBy: { stepOrder: 'asc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!employee || employee.workflowTasks.length === 0) {
      throw new NotFoundException('Workflow plan not found');
    }
    return this.mapPlan(employee);
  }

  async completeStep(
    id: string,
    dto: CompleteOnboardingStepDto,
    user: AuthenticatedUser,
  ) {
    const step = await this.prisma.workflowTask.findUnique({
      where: { id },
      include: { employee: true, assignee: true },
    });
    if (!step) {
      throw new NotFoundException('Workflow step not found');
    }
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const privileged = user.role === 'ADMIN' || user.role === 'HR';
    const authorized =
      privileged ||
      actor?.id === step.employeeId ||
      actor?.id === step.assignedTo ||
      actor?.id === step.employee.managerId;
    if (!authorized) throw new ForbiddenException('You cannot complete this workflow step');
    if (step.status === 'DONE') return step;

    const completed = await this.prisma.workflowTask.update({
      where: { id },
      data: {
        completedAt: new Date(),
        completionNote: dto.note,
        status: 'DONE',
        locked: false,
      },
    });

    const next = await this.prisma.workflowTask.findFirst({
      where: {
        employeeId: step.employeeId,
        workflowType: step.workflowType,
        stepOrder: { gt: step.stepOrder },
        status: { not: 'DONE' },
      },
      orderBy: { stepOrder: 'asc' },
    });
    if (next) {
      await this.prisma.workflowTask.update({
        where: { id: next.id },
        data: { locked: false },
      });
    } else {
      await this.finalizeWorkflow(step.employeeId, step.workflowType);
    }
    if (step.employee.userId) {
      await this.notifications.create({
        userId: step.employee.userId,
        type: 'ONBOARDING',
        title: 'Étape workflow terminée',
        message: `${step.title} a été marquée comme terminée.`,
        resourceType: 'WorkflowTask',
        resourceId: step.id,
      });
    }
    return completed;
  }

  async findMine(user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');
    return this.findOne(employee.id);
  }

  async progress(id: string) {
    const plan = await this.findOne(id);
    return {
      planId: id,
      workflowType: plan.workflowType,
      totalSteps: plan.steps.length,
      completedSteps: plan.steps.filter((step: { status: string }) => step.status === 'DONE').length,
      progress: plan.progress,
    };
  }

  private mapPlan(employee: any) {
    const steps = employee.workflowTasks;
    const completed = steps.filter((step: any) => step.status === 'DONE').length;
    return {
      id: employee.id,
      workflowType: steps[0]?.workflowType ?? 'ONBOARDING',
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        manager: employee.manager,
      },
      steps,
      progress: steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100),
    };
  }

  private validateGeneratedTasks(tasks: GeneratedWorkflowTask[]) {
    if (!Array.isArray(tasks) || tasks.length < 3) {
      throw new UnprocessableEntityException('OpenCode Go returned too few workflow tasks');
    }
    return tasks.slice(0, 12).map((task, index) => {
      const title = this.cleanText(task.title);
      const description = this.cleanText(task.description);
      const phase = this.cleanText(task.phase) || `Phase ${index + 1}`;
      if (!title || !description) {
        throw new UnprocessableEntityException('OpenCode Go returned an invalid workflow task');
      }
      return {
        phase,
        title,
        description,
        assignee: this.isAssignee(task.assignee) ? task.assignee : 'HR',
        dueOffsetDays: this.clampDueOffset(task.dueOffsetDays),
      };
    });
  }

  private async generateTasksOrFail(workflowType: WorkflowType, employee: any) {
    try {
      return await this.llmService.generateWorkflowTasks({
        workflowType,
        employee: {
          fullName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          status: employee.status,
          hireDate: employee.hireDate?.toISOString().slice(0, 10),
          department: employee.department?.name,
          position: employee.position?.title,
          manager: employee.manager
            ? `${employee.manager.firstName} ${employee.manager.lastName}`
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new UnprocessableEntityException(
        `OpenCode Go workflow generation failed: ${error instanceof Error ? error.message : 'invalid response'}`,
      );
    }
  }

  private cleanText(value: unknown) {
    return typeof value === 'string' ? value.trim().slice(0, 500) : '';
  }

  private isAssignee(value: unknown): value is WorkflowAssignee {
    return value === 'EMPLOYEE' || value === 'MANAGER' || value === 'HR';
  }

  private clampDueOffset(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(Math.round(parsed), 0), 90);
  }

  private resolveAssignee(
    assignee: WorkflowAssignee,
    employee: { id: string; managerId: string | null },
    hrEmployeeId?: string,
  ) {
    if (assignee === 'EMPLOYEE') return employee.id;
    if (assignee === 'MANAGER') return employee.managerId ?? hrEmployeeId ?? null;
    return hrEmployeeId ?? null;
  }

  private async resolveCurrentWorkflowType(employeeId: string): Promise<WorkflowType> {
    const active = await this.prisma.workflowTask.findFirst({
      where: { employeeId, status: { not: 'DONE' } },
      orderBy: { stepOrder: 'asc' },
    });
    if (active?.workflowType === 'OFFBOARDING' || active?.workflowType === 'ONBOARDING') {
      return active.workflowType;
    }
    const latest = await this.prisma.workflowTask.findFirst({
      where: { employeeId },
      orderBy: { dueDate: 'desc' },
    });
    if (latest?.workflowType === 'OFFBOARDING' || latest?.workflowType === 'ONBOARDING') {
      return latest.workflowType;
    }
    return 'ONBOARDING';
  }

  private async finalizeWorkflow(employeeId: string, workflowType: WorkflowType) {
    if (workflowType === 'ONBOARDING') {
      const employee = await this.prisma.employee.update({
        where: { id: employeeId },
        data: { status: 'ACTIVE' },
      });
      if (employee.userId) {
        await this.prisma.user.update({
          where: { id: employee.userId },
          data: { onboardingState: 'OFF' },
        });
      }
      return;
    }

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE' },
    });
    if (employee.userId) {
      await this.prisma.user.update({
        where: { id: employee.userId },
        data: { onboardingState: 'OFF', accountStatus: 'SUSPENDED' },
      });
    }
  }
}
