import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { GenerateOnboardingPlanDto } from './dto/generate-onboarding-plan.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async generate(dto: GenerateOnboardingPlanDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.workflowTask.count({
      where: {
        employeeId: employee.id,
        workflowType: 'ONBOARDING',
        status: { not: 'DONE' },
      },
    });
    if (existing > 0) {
      throw new ConflictException('An active onboarding plan already exists');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const definitions = [
      ['Semaine 1 - Integration', 'Signature contrat', 0],
      ['Semaine 1 - Integration', 'Creation acces IT', 1],
      ['Semaine 1 - Integration', 'Presentation equipe', 3],
      ['Semaine 2 - Formation', 'Formation outils internes', 7],
    ] as const;

    await this.prisma.$transaction(
      definitions.map(([phase, title, offset], index) => {
        const dueDate = new Date(startsAt);
        dueDate.setDate(dueDate.getDate() + offset);
        return this.prisma.workflowTask.create({
          data: {
            employeeId: employee.id,
            assignedTo: employee.managerId ?? employee.id,
            workflowType: 'ONBOARDING',
            phase,
            stepOrder: index + 1,
            title,
            description: title,
            dueDate,
            locked: index > 0,
          },
        });
      }),
    );

    if (employee.userId) {
      await this.notifications.create({
        userId: employee.userId,
        type: 'ONBOARDING',
        title: 'Parcours onboarding créé',
        message: 'Votre parcours onboarding est maintenant disponible.',
        resourceType: 'Employee',
        resourceId: employee.id,
      });
    }
    return this.findOne(employee.id);
  }

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      where: { workflowTasks: { some: { workflowType: 'ONBOARDING' } } },
      include: {
        department: true,
        position: true,
        workflowTasks: {
          where: { workflowType: 'ONBOARDING' },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    return employees.map((employee) => this.mapPlan(employee));
  }

  async findOne(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        workflowTasks: {
          where: { workflowType: 'ONBOARDING' },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!employee || employee.workflowTasks.length === 0) {
      throw new NotFoundException('Onboarding plan not found');
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
    if (!step || step.workflowType !== 'ONBOARDING') {
      throw new NotFoundException('Onboarding step not found');
    }
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const privileged = user.role === 'ADMIN' || user.role === 'HR';
    const authorized =
      privileged ||
      actor?.id === step.employeeId ||
      actor?.id === step.assignedTo ||
      actor?.id === step.employee.managerId;
    if (!authorized) throw new ForbiddenException('You cannot complete this onboarding step');
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
        workflowType: 'ONBOARDING',
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
    }
    if (step.employee.userId) {
      await this.notifications.create({
        userId: step.employee.userId,
        type: 'ONBOARDING',
        title: 'Étape onboarding terminée',
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
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
      },
      steps,
      progress: steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100),
    };
  }
}
