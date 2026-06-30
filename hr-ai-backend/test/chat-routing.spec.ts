import { ChatService } from '../src/modules/chat/chat.service';

describe('ChatService routing', () => {
  const user = {
    userId: 'collaborator-user',
    email: 'collab@ydays.local',
    role: 'COLLABORATOR',
    fullName: 'Nadia Amrani',
  };

  function setup(history: Array<{ role: 'USER' | 'ASSISTANT'; content: string }> = []) {
    const prisma = {
      aiConversation: {
        create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
        findUnique: jest.fn(),
      },
      aiMessage: {
        findMany: jest.fn().mockResolvedValue(history),
        create: jest.fn().mockResolvedValue({ id: 'message' }),
        update: jest.fn(),
      },
    };
    const rag = {
      getAuthorizedDocumentCatalog: jest.fn().mockResolvedValue([
        { title: 'Règlement intérieur', category: 'Politiques' },
      ]),
      query: jest.fn().mockResolvedValue({
        answer: 'I do not have enough approved or indexed authorized information to answer that question.',
        refused: true,
        safetyStatus: 'BLOCKED',
        sources: [],
      }),
    };
    const actions = { propose: jest.fn().mockResolvedValue(null) };
    const llm = {
      detectLanguage: jest.fn().mockReturnValue('fr'),
      languageInstruction: jest.fn((language?: string) =>
        language === 'fr' ? 'Reply in French.' : 'Reply in English.',
      ),
      detectChatIntent: jest.fn().mockResolvedValue({
        intent: 'EMPLOYEE_DATA',
        language: 'en',
        resolvedQuestion: 'What is my HR information?',
      }),
      answerConversation: jest.fn().mockResolvedValue({
        content: 'I’m ARIA. Nice to meet you!',
        model: 'test-model',
        latencyMs: 10,
        promptTokens: 5,
        completionTokens: 7,
        totalTokens: 12,
      }),
    };
    const service = new ChatService(
      prisma as any,
      rag as any,
      {} as any,
      actions as any,
      llm as any,
    );
    return { service, prisma, rag, actions, llm };
  }

  it('uses normal conversation mode for tiny greetings without routing', async () => {
    const { service, rag, llm } = setup();

    const result = await service.ask({ question: 'bonjour' }, user);

    expect(result.refused).toBe(false);
    expect(result.answer).toBe('I’m ARIA. Nice to meet you!');
    expect(llm.answerConversation).toHaveBeenCalled();
    expect(llm.detectChatIntent).not.toHaveBeenCalled();
    expect(rag.query).not.toHaveBeenCalled();
  });

  it('routes non-trivial normal chat through the intent detector', async () => {
    const { service, rag, llm } = setup();
    llm.detectChatIntent.mockResolvedValue({
      intent: 'GENERAL_CHAT',
      language: 'en',
      resolvedQuestion: "what's your name?",
    });

    await service.ask({ question: "what's your name?" }, user);

    expect(llm.detectChatIntent).toHaveBeenCalled();
    expect(llm.answerConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        languageInstruction: 'Reply in English.',
      }),
    );
    expect(rag.query).not.toHaveBeenCalled();
  });

  it('passes recent conversation history to the intent router and normal answer', async () => {
    const history = [
      { role: 'ASSISTANT' as const, content: 'My name is ARIA.' },
      { role: 'USER' as const, content: 'Nice to meet you.' },
    ];
    const { service, llm } = setup(history);
    llm.detectChatIntent.mockResolvedValue({
      intent: 'GENERAL_CHAT',
      language: 'en',
      resolvedQuestion: 'Do you remember what I said?',
    });

    await service.ask({ question: 'do you remember what I said?' }, user);

    expect(llm.detectChatIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          { role: 'user', content: 'Nice to meet you.' },
          { role: 'assistant', content: 'My name is ARIA.' },
        ],
      }),
    );
    expect(llm.answerConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Nice to meet you.' },
          { role: 'assistant', content: 'My name is ARIA.' },
          { role: 'user', content: 'Do you remember what I said?' },
        ],
      }),
    );
  });

  it.each([
    'What is Omar Tazi salary?',
    'How many vacation days do I have?',
    'Show me employee documents',
    'Give me a list of all the managers and how many people they have in their team',
    'Grille salariale Engineering',
  ])('keeps HR data requests in secure RAG mode for "%s"', async (question) => {
    const { service, rag, llm } = setup();
    llm.detectChatIntent.mockResolvedValue({
      intent: 'EMPLOYEE_DATA',
      language: 'en',
      resolvedQuestion: question,
    });

    const result = await service.ask({ question }, user);

    expect(result.refused).toBe(true);
    expect(llm.detectChatIntent).toHaveBeenCalled();
    expect(rag.query).toHaveBeenCalledWith({ question }, user, question, 'en');
    expect(llm.answerConversation).not.toHaveBeenCalled();
  });

  it('routes company labor-code questions through document RAG instead of normal chat', async () => {
    const { service, rag, llm } = setup();
    llm.detectChatIntent.mockResolvedValue({
      intent: 'DOCUMENT_RAG',
      language: 'fr',
      resolvedQuestion: 'Résume le code du travail chez nous',
      searchQuery: 'code du travail chez nous règlement intérieur',
    });

    const question = 'resume moi le code du travail chez nous';
    const result = await service.ask({ question }, user);

    expect(result.refused).toBe(true);
    expect(rag.query).toHaveBeenCalledWith(
      { question: 'Résume le code du travail chez nous' },
      user,
      'code du travail chez nous règlement intérieur',
      'fr',
    );
    expect(llm.answerConversation).not.toHaveBeenCalled();
  });

  it('routes authorized indexed document titles through document RAG', async () => {
    const { service, rag, llm } = setup();
    llm.detectChatIntent.mockResolvedValue({
      intent: 'DOCUMENT_RAG',
      language: 'fr',
      resolvedQuestion: 'Résume le règlement intérieur en tableau',
      searchQuery: 'règlement intérieur résumé obligations principales',
    });
    rag.query.mockResolvedValue({
      answer: '| Sujet | Règle |',
      refused: false,
      safetyStatus: 'ALLOWED',
      sources: [{ documentId: 'document-1', title: 'Règlement intérieur' }],
    });

    const result = await service.ask(
      { question: 'tu peux me faire un résumé rapide du règlement intérieur juste un tableau' },
      user,
    );

    expect(rag.query).toHaveBeenCalledWith(
      { question: 'Résume le règlement intérieur en tableau' },
      user,
      'règlement intérieur résumé obligations principales',
      'fr',
    );
    expect(result.sources).toEqual([
      { documentId: 'document-1', title: 'Règlement intérieur' },
    ]);
  });

  it('uses semantic action routing for natural leave phrasing', async () => {
    const { service, actions, rag, llm } = setup();
    llm.detectChatIntent.mockResolvedValue({
      intent: 'PROPOSE_LEAVE_REQUEST',
      language: 'fr',
      resolvedQuestion: 'Je veux me reposer entre le 2026-08-07 et le 2026-08-09',
    });
    actions.propose.mockResolvedValue({
      id: 'draft-1',
      type: 'CREATE_LEAVE_REQUEST',
      summary: 'Create a 3-day leave request from 2026-08-07 to 2026-08-09',
      payload: {},
      expiresAt: new Date().toISOString(),
    });

    const result = await service.ask(
      { question: 'je suis fatigué je veux me reposer entre le 07/08 et le 09/08' },
      user,
    );

    expect(actions.propose).toHaveBeenCalledWith(
      'Je veux me reposer entre le 2026-08-07 et le 2026-08-09',
      'conversation-1',
      user,
      [],
    );
    expect((result as any).proposedAction?.type).toBe('CREATE_LEAVE_REQUEST');
    expect(rag.query).not.toHaveBeenCalled();
  });

  it('lists only the latest 10 conversations for the authenticated user', async () => {
    const { service, prisma } = setup();

    await service.findConversations(user);

    expect(prisma.aiConversation.findMany).toHaveBeenCalledWith({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { messages: true } },
      },
    });
  });
});
