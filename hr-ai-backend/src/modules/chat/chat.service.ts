import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { RagService } from '../rag/rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatActionService } from './chat-action.service';
import { LlmMessage, LlmService } from '../../services/llm/llm.service';

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

    const proposedAction = await this.actionService.propose(
      dto.question,
      conversation.id,
      user,
      history,
    );
    if (proposedAction) {
      const answer = this.actionProposalAnswer(dto.question, proposedAction.summary);
      await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: answer,
          safetyStatus: 'ALLOWED',
        },
      });
      return {
        conversationId: conversation.id,
        answer,
        refused: false,
        sources: [],
        proposedAction,
      };
    }

    let shouldUseSecureHrMode = this.shouldUseSecureHrMode(dto.question, history);
    let retrievalQuestion = dto.question;
    if (!shouldUseSecureHrMode) {
      const documents = await this.ragService.getAuthorizedDocumentCatalog(user);
      const detectedTool = await this.llmService.detectChatTool({
        question: dto.question,
        history,
        documents,
      });
      shouldUseSecureHrMode = detectedTool.tool === 'SEARCH_AUTHORIZED_HR';
      retrievalQuestion = detectedTool.searchQuery?.trim() || dto.question;

      // Safe fallback if the provider returns malformed routing JSON.
      if (
        !shouldUseSecureHrMode &&
        await this.ragService.hasAuthorizedDocumentReference(dto.question, user)
      ) {
        shouldUseSecureHrMode = true;
      }
    }

    if (!shouldUseSecureHrMode) {
      try {
        const completion = await this.llmService.answerConversation({
          role: user.role,
          userName: user.fullName,
          messages: [
            ...history,
            { role: 'user', content: dto.question },
          ],
        });
        await this.prisma.aiMessage.create({
          data: {
            conversationId: conversation.id,
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
        return {
          conversationId: conversation.id,
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
        await this.recordProviderError(conversation.id);
        throw error;
      }
    }

    let ragResponse: Awaited<ReturnType<RagService['query']>>;
    try {
      ragResponse = await this.ragService.query(
        { question: dto.question },
        user,
        retrievalQuestion,
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

    return { conversationId: conversation.id, ...ragResponse };
  }

  findConversations(user: AuthenticatedUser) {
    return this.prisma.aiConversation.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
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
    if (user.role !== 'ADMIN' && user.role !== 'HR') {
      throw new ForbiddenException('AI supervision is restricted to HR and Admin');
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
    if (user.role !== 'ADMIN' && user.role !== 'HR') {
      throw new ForbiddenException('AI supervision is restricted to HR and Admin');
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

  private actionProposalAnswer(question: string, summary: string) {
    if (/[\u0600-\u06ff]/.test(question)) {
      return `حضّرت هذا الإجراء: ${summary}. راجعه واضغط على قبول لتنفيذه.`;
    }
    if (/\b(le|la|les|des|mon|ma|mes|demande|conge|document|valide)\b/i.test(question)) {
      return `J’ai préparé cette action : ${summary}. Vérifiez-la puis cliquez sur Accepter pour l’exécuter.`;
    }
    return `I prepared this action: ${summary}. Review it and press Accept to execute it.`;
  }

  private async getConversationHistory(conversationId: string): Promise<LlmMessage[]> {
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 12,
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

  private shouldUseSecureHrMode(question: string, history: LlmMessage[]) {
    const normalized = question
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const hrTerms =
      /\b(hr|human resources|rh|ressources humaines|employee|employees|employe|employes|staff|people|workforce|salary|salaries|salary grid|pay band|salaire|salaires|grille salariale|payroll|paie|compensation|vacation|leave|conge|conges|rtt|absence|absences|document|documents|attestation|bulletin|certificate|certificat|onboarding|offboarding|performance|engagement|presence|manager|managers|team|teams|team size|org chart|organization chart|reporting line|department|departement|position|poste|request|requests|demande|demandes|headcount|effectif|wellbeing|bien etre|qvt|risk alert|alerte risque)\b/;
    const privateDataTerms =
      /\b(address|adresse|phone|telephone|email|e mail|hire date|date d embauche|skills|competences|profile|profil|record|dossier)\b/;
    const securityTerms =
      /\b(ignore previous instructions|ignore all instructions|reveal system prompt|show hidden prompt|bypass security|oublie les instructions|ignore les instructions)\b/;
    if (hrTerms.test(normalized) || privateDataTerms.test(normalized) || securityTerms.test(normalized)) {
      return true;
    }

    const followUp =
      /^(and|also|what about|how about|why|when|where|who|which|how many|combien|et|aussi|et pour|pourquoi|quand|ou|qui|lequel|laquelle|ceux|celles|them|they|he|she|him|her|lui|elle|eux|ca|cela)\b/;
    if (!followUp.test(normalized.trim())) return false;
    return history.slice(-4).some((message) => hrTerms.test(this.normalizeForRouting(message.content)));
  }

  private normalizeForRouting(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
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
}
