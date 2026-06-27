import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service';

describe('OnboardingService AI workflow activation', () => {
  const hrUser = {
    userId: 'hr-user',
    email: 'hr@ydays.local',
    role: 'HR',
    fullName: 'Salma Bennani',
  };

  const employee = {
    id: 'employee-1',
    userId: 'user-1',
    firstName: 'Nadia',
    lastName: 'Amrani',
    email: 'nadia@example.com',
    status: 'ACTIVE',
    hireDate: new Date('2026-06-01T00:00:00Z'),
    managerId: 'manager-1',
    department: { id: 'department-1', name: 'Engineering' },
    position: { id: 'position-1', title: 'Développeuse Full Stack' },
    manager: {
      id: 'manager-1',
      firstName: 'Omar',
      lastName: 'Tazi',
      email: 'omar@example.com',
      user: { id: 'manager-user' },
    },
    user: { id: 'user-1' },
  };

  const aiTasks = [
    {
      phase: 'Préparation',
      title: 'Préparer les accès',
      description: 'Créer les accès adaptés au poste.',
      assignee: 'HR',
      dueOffsetDays: 0,
    },
    {
      phase: 'Manager',
      title: 'Planifier le point équipe',
      description: 'Organiser la présentation avec le manager.',
      assignee: 'MANAGER',
      dueOffsetDays: 2,
    },
    {
      phase: 'Collaborateur',
      title: 'Lire les politiques internes',
      description: 'Prendre connaissance des règles internes.',
      assignee: 'EMPLOYEE',
      dueOffsetDays: 4,
    },
  ];

  function setup(overrides: Record<string, unknown> = {}) {
    const planEmployee = {
      ...employee,
      workflowTasks: aiTasks.map((task, index) => ({
        id: `task-${index + 1}`,
        ...task,
        workflowType: 'ONBOARDING',
        stepOrder: index + 1,
        status: 'TODO',
        locked: index > 0,
        dueDate: new Date(`2026-06-0${index + 1}T00:00:00Z`),
        assignee: null,
      })),
    };
    const prisma = {
      employee: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(employee)
          .mockResolvedValueOnce({ id: 'hr-employee' })
          .mockResolvedValueOnce(planEmployee),
        update: jest.fn().mockResolvedValue(employee),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
      workflowTask: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => ({ id: `created-${data.stepOrder}`, ...data })),
        findFirst: jest.fn().mockResolvedValue({ workflowType: 'ONBOARDING' }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (operations) => Promise.all(operations)),
      ...overrides,
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const llm = { generateWorkflowTasks: jest.fn().mockResolvedValue(aiTasks) };
    return {
      service: new OnboardingService(prisma as any, notifications as any, llm as any),
      prisma,
      notifications,
      llm,
    };
  }

  it('activates onboarding using OpenCode Go employee context', async () => {
    const { service, prisma, llm } = setup();

    const plan = await service.activate(
      { employeeId: employee.id, workflowType: 'ONBOARDING', startsAt: '2026-06-01' },
      hrUser as any,
    );

    expect(llm.generateWorkflowTasks).toHaveBeenCalledWith({
      workflowType: 'ONBOARDING',
      employee: expect.objectContaining({
        fullName: 'Nadia Amrani',
        department: 'Engineering',
        position: 'Développeuse Full Stack',
        manager: 'Omar Tazi',
      }),
    });
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: employee.id },
      data: { status: 'ONBOARDING' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingState: 'ON' },
    });
    expect(prisma.workflowTask.create).toHaveBeenCalledTimes(3);
    expect(plan.workflowType).toBe('ONBOARDING');
  });

  it('activates offboarding and marks the account as offboarding', async () => {
    const { service, prisma } = setup();

    await service.activate(
      { employeeId: employee.id, workflowType: 'OFFBOARDING' },
      hrUser as any,
    );

    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: employee.id },
      data: { status: 'OFFBOARDING' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingState: 'OFFBOARDING' },
    });
  });

  it('prevents duplicate active workflows', async () => {
    const { service, prisma, llm } = setup();
    prisma.workflowTask.count.mockResolvedValueOnce(1);

    await expect(
      service.activate({ employeeId: employee.id, workflowType: 'ONBOARDING' }, hrUser as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(llm.generateWorkflowTasks).not.toHaveBeenCalled();
  });

  it('rejects invalid generated workflow tasks without creating records', async () => {
    const { service, prisma, llm } = setup();
    llm.generateWorkflowTasks.mockResolvedValueOnce([{ title: '', description: '' }]);

    await expect(
      service.activate({ employeeId: employee.id, workflowType: 'ONBOARDING' }, hrUser as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('finalizes the last offboarding step by inactivating employee and suspending account', async () => {
    const step = {
      id: 'step-1',
      employeeId: employee.id,
      assignedTo: 'hr-employee',
      workflowType: 'OFFBOARDING',
      stepOrder: 3,
      status: 'TODO',
      title: 'Clôturer le compte',
      employee: { id: employee.id, managerId: 'manager-1', userId: 'user-1' },
      assignee: null,
    };
    const { service, prisma } = setup();
    prisma.workflowTask.findUnique.mockResolvedValueOnce(step);
    prisma.employee.findUnique.mockResolvedValueOnce({ id: 'hr-employee' });
    prisma.workflowTask.update.mockResolvedValueOnce({ ...step, status: 'DONE' });
    prisma.workflowTask.findFirst.mockResolvedValueOnce(null);
    prisma.employee.update.mockResolvedValueOnce({ id: employee.id, userId: 'user-1' });

    await service.completeStep(step.id, {}, hrUser as any);

    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: employee.id },
      data: { status: 'INACTIVE' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingState: 'OFF', accountStatus: 'SUSPENDED' },
    });
  });
});
