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
      },
      aiMessage: {
        findMany: jest.fn().mockResolvedValue(history),
        create: jest.fn().mockResolvedValue({ id: 'message' }),
        update: jest.fn(),
      },
    };
    const rag = {
      hasAuthorizedDocumentReference: jest.fn().mockResolvedValue(false),
      getAuthorizedDocumentCatalog: jest.fn().mockResolvedValue([
        { title: 'reglement interieur', category: 'Politiques' },
      ]),
      query: jest.fn().mockResolvedValue({
        answer: 'You are not authorized to access that employee information.',
        refused: true,
        safetyStatus: 'BLOCKED',
        sources: [],
      }),
    };
    const actions = { propose: jest.fn().mockResolvedValue(null) };
    const llm = {
      detectChatTool: jest.fn().mockResolvedValue({ tool: 'CONVERSATION' }),
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

  it.each(['bonjour', "what's ur name ?", 'tell me a joke'])(
    'uses normal conversation mode for "%s"',
    async (question) => {
      const { service, rag, llm } = setup();

      const result = await service.ask({ question }, user);

      expect(result.refused).toBe(false);
      expect(result.answer).toBe('I’m ARIA. Nice to meet you!');
      expect(llm.answerConversation).toHaveBeenCalled();
      expect(rag.query).not.toHaveBeenCalled();
    },
  );

  it('passes recent conversation history to normal chat', async () => {
    const history = [
      { role: 'ASSISTANT' as const, content: 'My name is ARIA.' },
      { role: 'USER' as const, content: 'Nice to meet you.' },
    ];
    const { service, llm } = setup(history);

    await service.ask({ question: 'do you remember what I said?' }, user);

    expect(llm.answerConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Nice to meet you.' },
          { role: 'assistant', content: 'My name is ARIA.' },
          { role: 'user', content: 'do you remember what I said?' },
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

    const result = await service.ask({ question }, user);

    expect(result.refused).toBe(true);
    expect(rag.query).toHaveBeenCalledWith({ question }, user, question);
    expect(llm.answerConversation).not.toHaveBeenCalled();
  });

  it('uses secure RAG mode when the question references an authorized indexed document title', async () => {
    const { service, rag, llm } = setup();
    llm.detectChatTool.mockResolvedValue({
      tool: 'SEARCH_AUTHORIZED_HR',
      searchQuery: 'reglement interieur resume obligations principales',
    });
    rag.query.mockResolvedValue({
      answer: '| Sujet | Règle |',
      refused: false,
      safetyStatus: 'ALLOWED',
      sources: [{ documentId: 'document-1', title: 'reglement interieur' }],
    });
    const question =
      'tu peux me faire un resume rapide du reglement interieur just un tableau avec le plus important a savoir';

    const result = await service.ask({ question }, user);

    expect(llm.detectChatTool).toHaveBeenCalledWith({
      question,
      history: [],
      documents: [{ title: 'reglement interieur', category: 'Politiques' }],
    });
    expect(rag.query).toHaveBeenCalledWith(
      { question },
      user,
      'reglement interieur resume obligations principales',
    );
    expect(result.sources).toEqual([
      { documentId: 'document-1', title: 'reglement interieur' },
    ]);
    expect(llm.answerConversation).not.toHaveBeenCalled();
  });
});
