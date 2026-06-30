import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { RagService } from '../rag/rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatActionService } from './chat-action.service';
import { DetectedChatIntent, LlmMessage, LlmService } from '../../services/llm/llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
    private readonly auditService: AuditService,
    private readonly actionService: ChatActionService,
    private readonly llmService: LlmService,
  ) {}

  async ask(dto: AskQuestionDto, user: AuthenticatedUser) {
    const conversation = await this.getOrCreateConversation(dto, user);
    const history = await this.getConversationHistory(conversation.id);
    const userMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.userId,
        role: 'USER',
        content: dto.question,
      },
    });

    if (this.isTinyGreeting(dto.question)) {
      return this.answerConversation(conversation.id, dto.question, history, user, {
        intent: 'GENERAL_CHAT',
        language: this.llmService.detectLanguage(dto.question),
        resolvedQuestion: dto.question,
      });
    }

    const documents = await this.ragService.getAuthorizedDocumentCatalog(user);
    const intent = await this.llmService.detectChatIntent({
      question: dto.question,
      history,
      documents,
      role: user.role,
    });
    const resolvedQuestion = intent.resolvedQuestion?.trim() || dto.question;

    if (
      intent.intent === 'PROPOSE_LEAVE_REQUEST' ||
      intent.intent === 'PROPOSE_DOCUMENT_REQUEST'
    ) {
      const proposedAction = await this.actionService.propose(
        resolvedQuestion,
        conversation.id,
        user,
        history,
      );
      if (proposedAction) {
        if (proposedAction.redactedUserContent && proposedAction.redactedUserContent !== dto.question) {
          await this.prisma.aiMessage.update({
            where: { id: userMessage.id },
            data: { content: proposedAction.redactedUserContent },
          });
        }
        if ('followUp' in proposedAction) {
          const answer = proposedAction.followUp;
          await this.prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: answer,
              safetyStatus: 'ALLOWED',
            },
          });
          await this.touchConversation(conversation.id);
          return {
            conversationId: conversation.id,
            answer,
            refused: false,
            sources: [],
          };
        }
        const { redactedUserContent: _redactedUserContent, ...publicAction } = proposedAction;
        const answer = this.actionProposalAnswer(intent.language, proposedAction.summary);
        await this.prisma.aiMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: answer,
            safetyStatus: 'ALLOWED',
          },
        });
        await this.touchConversation(conversation.id);
        return {
          conversationId: conversation.id,
          answer,
          refused: false,
          sources: [],
          proposedAction: publicAction,
        };
      }
      return this.storeAssistantText(
        conversation.id,
        this.missingActionDetailsAnswer(intent),
        'ALLOWED',
      ).then((answer) => ({
        conversationId: conversation.id,
        answer,
        refused: false,
        safetyStatus: 'ALLOWED' as const,
        sources: [],
      }));
    }

    if (intent.intent === 'GENERAL_CHAT') {
      return this.answerConversation(conversation.id, resolvedQuestion, history, user, intent);
    }

    const retrievalQuestion =
      intent.intent === 'DOCUMENT_RAG'
        ? intent.searchQuery?.trim() || resolvedQuestion
        : resolvedQuestion;

    let ragResponse: Awaited<ReturnType<RagService['query']>>;
    try {
      ragResponse = await this.ragService.query(
        { question: resolvedQuestion },
        user,
        retrievalQuestion,
        intent.language,
      );
    } catch (error) {
      await this.recordProviderError(conversation.id);
      throw error;
    }

    if (ragResponse.safetyStatus === 'BLOCKED') {
      await this.prisma.aiMessage.update({
        where: { id: userMessage.id },
        data: { safetyStatus: 'BLOCKED' },
      });
    }
    await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: ragResponse.answer,
        model: ragResponse.model,
        safetyStatus: ragResponse.safetyStatus,
        latencyMs: ragResponse.latencyMs,
        promptTokens: ragResponse.promptTokens,
        completionTokens: ragResponse.completionTokens,
        totalTokens: ragResponse.totalTokens,
        sources: ragResponse.sources as unknown as Prisma.InputJsonValue,
      },
    });
    await this.touchConversation(conversation.id);

    return { conversationId: conversation.id, ...ragResponse };
  }

  async askStream(dto: AskQuestionDto, user: AuthenticatedUser, response: Response) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();
    this.writeSse(response, 'message_start', {});
    try {
      const result = await this.ask(dto, user);
      for (const chunk of this.chunkForSse(result.answer ?? '')) {
        this.writeSse(response, 'token', { content: chunk });
      }
      this.writeSse(response, 'done', result);
    } catch (error) {
      this.writeSse(response, 'error', {
        message: error instanceof Error ? error.message : 'The assistant is unavailable.',
      });
    } finally {
      response.end();
    }
  }

  findConversations(user: AuthenticatedUser) {
    return this.prisma.aiConversation.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async findConversation(id: string, user: AuthenticatedUser) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId: user.userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        actionDrafts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  supervision(user: AuthenticatedUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('AI supervision is restricted to Admin');
    }
    return this.prisma.aiMessage.findMany({
      where: { OR: [{ safetyStatus: 'BLOCKED' }, { role: 'ASSISTANT' }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        conversationId: true,
        role: true,
        content: true,
        model: true,
        safetyStatus: true,
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        createdAt: true,
        userId: true,
      },
    }).then((messages) =>
      messages.map((message) => ({
        ...message,
        content: message.safetyStatus === 'BLOCKED' ? message.content : undefined,
      })),
    );
  }

  async supervisionSummary(user: AuthenticatedUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('AI supervision is restricted to Admin');
    }
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const messages = await this.prisma.aiMessage.findMany({
      where: { createdAt: { gte: since } },
      select: {
        role: true,
        safetyStatus: true,
        latencyMs: true,
        totalTokens: true,
        createdAt: true,
      },
    });
    const userMessages = messages.filter((message) => message.role === 'USER');
    const assistantMessages = messages.filter((message) => message.role === 'ASSISTANT');
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(since);
      date.setDate(date.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        queries: userMessages.filter((message) => message.createdAt.toISOString().slice(0, 10) === key).length,
      };
    });
    const latencies = assistantMessages.map((message) => message.latencyMs).filter((value): value is number => value !== null);
    return {
      questionsAsked: userMessages.length,
      refusals: messages.filter((message) => message.safetyStatus === 'BLOCKED').length,
      averageLatencyMs: latencies.length
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : 0,
      totalTokens: assistantMessages.reduce((sum, message) => sum + (message.totalTokens ?? 0), 0),
      daily,
    };
  }

  confirmAction(id: string, user: AuthenticatedUser, attachment?: Express.Multer.File) {
    return this.actionService.confirm(id, user, attachment);
  }

  cancelAction(id: string, user: AuthenticatedUser) {
    return this.actionService.cancel(id, user);
  }

  private async getOrCreateConversation(dto: AskQuestionDto, user: AuthenticatedUser) {
    if (!dto.conversationId) {
      return this.prisma.aiConversation.create({
        data: {
          userId: user.userId,
          title: dto.question.slice(0, 80),
          roleScope: user.role,
        },
      });
    }
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: dto.conversationId },
    });
    if (!conversation || conversation.userId !== user.userId) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'conversation-access-denied',
        conversationId: dto.conversationId,
      });
      throw new ForbiddenException('You cannot access this conversation');
    }
    return conversation;
  }

  private actionProposalAnswer(language: string | undefined, summary: string) {
    if (language === 'ar') {
      return `حضّرت هذا الإجراء: ${summary}. راجعه واضغط على قبول لتنفيذه.`;
    }
    if (language === 'fr') {
      return `J’ai préparé cette action : ${summary}. Vérifiez-la puis cliquez sur Accepter pour l’exécuter.`;
    }
    return `I prepared this action: ${summary}. Review it and press Accept to execute it.`;
  }

  private missingActionDetailsAnswer(intent: DetectedChatIntent) {
    if (intent.intent === 'PROPOSE_DOCUMENT_REQUEST') {
      if (intent.language === 'fr') return 'Quel document souhaitez-vous demander ?';
      if (intent.language === 'ar') return 'ما هو المستند الذي تريد طلبه؟';
      return 'Which document would you like to request?';
    }
    if (intent.language === 'fr') return 'Pour préparer le congé, j’ai besoin des dates de début et de fin.';
    if (intent.language === 'ar') return 'لتحضير طلب الإجازة، أحتاج إلى تاريخ البداية وتاريخ النهاية.';
    return 'To prepare the leave request, I need the start and end dates.';
  }

  private async answerConversation(
    conversationId: string,
    question: string,
    history: LlmMessage[],
    user: AuthenticatedUser,
    intent: DetectedChatIntent,
  ) {
    try {
      const completion = await this.llmService.answerConversation({
        role: user.role,
        userName: user.fullName,
        languageInstruction: this.llmService.languageInstruction(intent.language),
        messages: [
          ...history,
          { role: 'user', content: question },
        ],
      });
      await this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: completion.content,
          model: completion.model,
          safetyStatus: 'ALLOWED',
          latencyMs: completion.latencyMs,
          promptTokens: completion.promptTokens,
          completionTokens: completion.completionTokens,
          totalTokens: completion.totalTokens,
          sources: [],
        },
      });
      await this.touchConversation(conversationId);
      return {
        conversationId,
        answer: completion.content,
        refused: false,
        safetyStatus: 'ALLOWED' as const,
        sources: [],
        model: completion.model,
        latencyMs: completion.latencyMs,
        promptTokens: completion.promptTokens,
        completionTokens: completion.completionTokens,
        totalTokens: completion.totalTokens,
      };
    } catch (error) {
      await this.recordProviderError(conversationId);
      throw error;
    }
  }

  private async storeAssistantText(
    conversationId: string,
    content: string,
    safetyStatus: 'ALLOWED' | 'BLOCKED' | 'ERROR',
  ) {
    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content,
        safetyStatus,
      },
    });
    await this.touchConversation(conversationId);
    return content;
  }

  private async getConversationHistory(conversationId: string): Promise<LlmMessage[]> {
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 16,
      select: { role: true, content: true },
    });
    return messages
      .reverse()
      .filter((message) => message.role === 'USER' || message.role === 'ASSISTANT')
      .map((message) => ({
        role: message.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: message.content,
      }));
  }

  private isTinyGreeting(question: string) {
    const normalized = question
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return /^(hi|hello|hey|thanks|thank you|bonjour|salut|merci|coucou|yo|salam|مرحبا)[!.?\s]*$/.test(normalized);
  }

  private recordProviderError(conversationId: string) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: 'The assistant is temporarily unavailable. Please try again later.',
        safetyStatus: 'ERROR',
      },
    });
  }

  private touchConversation(conversationId: string) {
    return this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private writeSse(response: Response, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private chunkForSse(answer: string) {
    const chunks: string[] = [];
    for (let index = 0; index < answer.length; index += 120) {
      chunks.push(answer.slice(index, index + 120));
    }
    return chunks.length ? chunks : [''];
  }
}
