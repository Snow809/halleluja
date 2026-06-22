import { HrContextService } from '../src/modules/rag/hr-context.service';

describe('HrContextService organization access', () => {
  const hrUser = {
    userId: 'hr-user',
    email: 'hr@ydays.local',
    role: 'HR',
    fullName: 'Salma Bennani',
  };

  it('returns manager names and direct-report counts to HR', async () => {
    const prisma = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({ id: 'hr-employee' }),
        findMany: jest.fn().mockResolvedValue([
          {
            firstName: 'Omar',
            lastName: 'Tazi',
            employeeNumber: 'MA-0003',
            department: { name: 'Engineering' },
            position: { title: 'Engineering Manager' },
            reports: [
              {
                firstName: 'Nadia',
                lastName: 'Amrani',
                employeeNumber: 'MA-0004',
                position: { title: 'Développeuse Full Stack' },
              },
              {
                firstName: 'Anas',
                lastName: 'Haddad',
                employeeNumber: 'MA-0013',
                position: { title: 'Backend Developer' },
              },
            ],
          },
        ]),
      },
    };
    const access = {
      getActor: jest.fn().mockResolvedValue({ id: 'hr-employee' }),
      isGlobalHr: jest.fn().mockReturnValue(true),
    };
    const service = new HrContextService(prisma as any, access as any);

    const result = await service.build(
      'Give me a list of all managers and how many people they have in their team',
      hrUser,
    );

    expect(result.refused).toBe(false);
    expect(result.context).toContain('"manager":"Omar Tazi"');
    expect(result.context).toContain('"teamSize":2');
  });

  it('rejects organization-wide team structure for collaborators', async () => {
    const access = {
      getActor: jest.fn().mockResolvedValue({ id: 'collaborator' }),
      isGlobalHr: jest.fn().mockReturnValue(false),
    };
    const service = new HrContextService({} as any, access as any);

    const result = await service.build(
      'List all managers and their teams',
      { ...hrUser, role: 'COLLABORATOR' },
    );

    expect(result.refused).toBe(true);
  });
});
