import { ChatActionService } from '../src/modules/chat/chat-action.service';

describe('ChatActionService proposals', () => {
  const user = {
    userId: 'hr-user',
    email: 'hr@ydays.local',
    role: 'HR',
    fullName: 'Salma Bennani',
  };

  function setup(templates: any[] = [], detected: any = { type: 'NONE' }) {
    const prisma = {
      aiActionDraft: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'draft-1',
          ...data,
        })),
      },
      documentTemplate: {
        findMany: jest.fn().mockResolvedValue(templates),
      },
    };
    const llm = {
      detectSelfServiceAction: jest.fn().mockResolvedValue(detected),
    };
    const service = new ChatActionService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      llm as any,
    );
    return { service, prisma, llm };
  }

  it('understands French DD/MM leave requests and creates a confirmation draft', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-22T10:00:00Z'));
    const { service, prisma } = setup([], {
      type: 'CREATE_LEAVE_REQUEST',
      leaveType: 'Congés payés',
      startDate: '2026-06-25',
      endDate: '2026-07-03',
    });

    const proposal = await service.propose(
      'je veux prendre un conge du 25/06 au 03/07',
      'conversation',
      user,
    );

    expect(proposal).toEqual(
      expect.objectContaining({
        type: 'CREATE_LEAVE_REQUEST',
        payload: expect.objectContaining({
          startDate: '2026-06-25',
          endDate: '2026-07-03',
          durationDays: 9,
        }),
      }),
    );
    expect(prisma.aiActionDraft.create).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('tolerates the exact misspelled leave request used in the UI', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-22T10:00:00Z'));
    const { service, llm } = setup([], {
      type: 'CREATE_LEAVE_REQUEST',
      leaveType: 'Congés payés',
      startDate: '2026-06-26',
      endDate: '2026-07-03',
    });

    const proposal = await service.propose(
      'je veux prendre un congee entre le 26/06 et le 03/07',
      'conversation',
      user,
    );

    expect(proposal).toEqual(
      expect.objectContaining({
        type: 'CREATE_LEAVE_REQUEST',
        payload: expect.objectContaining({
          startDate: '2026-06-26',
          endDate: '2026-07-03',
        }),
      }),
    );
    expect(llm.detectSelfServiceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'je veux prendre un congee entre le 26/06 et le 03/07',
      }),
    );
    jest.useRealTimers();
  });

  it('matches a requested document template by meaningful words', async () => {
    const { service } = setup([
      {
        id: 'work-certificate',
        title: 'Modèle attestation de travail',
        documentType: 'Attestation de travail',
        isActive: true,
      },
      {
        id: 'cnss-certificate',
        title: 'Modèle attestation CNSS',
        documentType: 'Attestation CNSS',
        isActive: true,
      },
    ], {
      type: 'CREATE_DOCUMENT_REQUEST',
      templateId: 'work-certificate',
    });

    const proposal = await service.propose(
      'je veux demander mon attestation de travail',
      'conversation',
      user,
    );

    expect(proposal).toEqual(
      expect.objectContaining({
        type: 'CREATE_DOCUMENT_REQUEST',
        payload: expect.objectContaining({ templateId: 'work-certificate' }),
      }),
    );
  });

  it('tolerates a minor typo when requesting a document', async () => {
    const { service, llm } = setup([
      {
        id: 'work-certificate',
        title: 'Modèle attestation de travail',
        documentType: 'Attestation de travail',
        isActive: true,
      },
    ], {
      type: 'CREATE_DOCUMENT_REQUEST',
      templateId: 'work-certificate',
    });

    const proposal = await service.propose(
      'je veux demander une attistation de travail',
      'conversation',
      user,
    );

    expect(proposal).toEqual(
      expect.objectContaining({
        type: 'CREATE_DOCUMENT_REQUEST',
        payload: expect.objectContaining({ templateId: 'work-certificate' }),
      }),
    );
    expect(llm.detectSelfServiceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'je veux demander une attistation de travail',
      }),
    );
  });
});
