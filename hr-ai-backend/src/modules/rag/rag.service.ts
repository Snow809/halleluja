import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { LlmService } from '../../services/llm/llm.service';
import { DocumentParserService } from '../../services/document-parser/document-parser.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RetrieverService } from './retriever.service';
import { HrContextService } from './hr-context.service';
import { S3Service } from '../../services/storage/s3.service';
import { EmbeddingsService } from '../../services/embeddings/embeddings.service';

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieverService: RetrieverService,
    private readonly hrContextService: HrContextService,
    private readonly parser: DocumentParserService,
    private readonly llmService: LlmService,
    private readonly auditService: AuditService,
    private readonly s3: S3Service,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async answerWithSources(
    dto: RagQueryDto,
    user: AuthenticatedUser,
    retrievalQuestion = dto.question,
    language?: string,
  ) {
    if (this.looksLikePromptInjection(dto.question)) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'prompt-injection-pattern',
      });
      return {
        answer: 'I cannot follow instructions that attempt to override HR security rules.',
        refused: true,
        sources: [],
        safetyStatus: 'BLOCKED' as const,
      };
    }

    const hrContext = await this.hrContextService.build(dto.question, user);
    if (hrContext.refused) {
      await this.auditService.logAIRefusal(user.userId, {
        question: dto.question,
        reason: hrContext.reason,
      });
      return {
        answer: hrContext.reason ?? 'You are not authorized to access that information.',
        refused: true,
        sources: [],
        safetyStatus: 'BLOCKED' as const,
      };
    }

    const chunks = await this.retrieverService.retrieveRelevantChunks(retrievalQuestion, user);
    if (!hrContext.context && chunks.length === 0) {
      return this.rejectIfNoSource(dto.question, user, language);
    }

    const documentContext = chunks
      .map(
        (chunk, index) =>
          `[DOCUMENT ${index + 1}: ${chunk.title}, chunk ${chunk.chunkOrder + 1}]\n${chunk.content}`,
      )
      .join('\n\n');
    const context = [
      hrContext.context ? `LIVE HR DATA:\n${hrContext.context}` : '',
      documentContext ? `APPROVED DOCUMENT EXCERPTS:\n${documentContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const completion = await this.llmService.answerGroundedQuestion({
      question: dto.question,
      context,
      role: user.role,
      languageInstruction: this.languageInstruction(dto.question, language),
    });
    return {
      answer: completion.content,
      refused: false,
      safetyStatus: 'ALLOWED' as const,
      sources: chunks.map((chunk) => ({
        documentId: chunk.documentId,
        title: chunk.title,
        sourcePage: chunk.sourcePage,
        chunkOrder: chunk.chunkOrder,
      })),
      model: completion.model,
      latencyMs: completion.latencyMs,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      totalTokens: completion.totalTokens,
    };
  }

  async rejectIfNoSource(question: string, user: AuthenticatedUser, language?: string) {
    await this.auditService.logAIRefusal(user.userId, {
      question,
      reason: 'no-authorized-source',
    });
    return {
      answer: this.noSourceAnswer(question, language),
      refused: true,
      sources: [],
      safetyStatus: 'BLOCKED' as const,
    };
  }

  async indexDocument(documentId: string) {
    const document = await this.prisma.hrDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== 'APPROVED') {
      throw new BadRequestException('Only approved documents can be indexed');
    }

    await this.prisma.hrDocument.update({
      where: { id: documentId },
      data: { indexedStatus: 'INDEXING', indexError: null },
    });

    try {
      const file = await this.s3.getFileBuffer(document.filePath);
      const parsed = await this.parser.parseBuffer(file, document.fileType);
      const chunks = this.chunkText(parsed.text);
      if (chunks.length === 0) {
        throw new BadRequestException('The document contains no indexable text');
      }

      await this.prisma.documentChunk.deleteMany({ where: { documentId } });

      const createdChunks = await this.prisma.$transaction(
        chunks.map((chunkText, chunkOrder) =>
          this.prisma.documentChunk.create({
            data: {
              documentId,
              chunkText,
              chunkOrder,
            },
          }),
        ),
      );

      for (const chunk of createdChunks) {
        const embedding = await this.embeddings.generateEmbedding(
          `${document.title}\n${document.category}\n\n${chunk.chunkText}`,
          'RETRIEVAL_DOCUMENT',
        );
        await this.prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET
            "embedding" = ${this.vectorLiteral(embedding.embedding)}::vector,
            "embeddingRef" = ${embedding.model},
            "embeddingModel" = ${embedding.model}
          WHERE "id" = ${chunk.id}
        `;
      }
      await this.prisma.hrDocument.update({
        where: { id: documentId },
        data: { indexedStatus: 'INDEXED', indexedAt: new Date(), indexError: null },
      });
      await this.auditService.log(undefined, 'DOCUMENT_REINDEX', 'HrDocument', documentId, 'SUCCESS', {
        chunksCreated: createdChunks.length,
      });
      return { documentId, status: 'indexed', chunksCreated: createdChunks.length };
    } catch (error) {
      await this.prisma.documentChunk.deleteMany({ where: { documentId } });
      await this.prisma.hrDocument.update({
        where: { id: documentId },
        data: {
          indexedStatus: 'FAILED',
          indexError: error instanceof Error ? error.message : 'Unknown indexing error',
        },
      });
      await this.auditService.log(undefined, 'DOCUMENT_REINDEX', 'HrDocument', documentId, 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown indexing error',
      });
      throw error;
    }
  }

  async removeDocumentIndex(documentId: string) {
    const result = await this.prisma.documentChunk.deleteMany({ where: { documentId } });
    await this.prisma.hrDocument.update({
      where: { id: documentId },
      data: { indexedStatus: 'NOT_INDEXED', indexedAt: null, indexError: null },
    });
    return result;
  }

  async reindexApprovedDocuments() {
    const documents = await this.prisma.hrDocument.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
    const results: Array<{
      documentId: string;
      title: string;
      status: 'indexed' | 'failed';
      chunksCreated?: number;
      error?: string;
    }> = [];

    for (const document of documents) {
      try {
        const result = await this.indexDocument(document.id);
        results.push({
          documentId: document.id,
          title: document.title,
          status: 'indexed',
          chunksCreated: result.chunksCreated,
        });
      } catch (error) {
        results.push({
          documentId: document.id,
          title: document.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown indexing error',
        });
      }
    }

    return {
      total: documents.length,
      indexed: results.filter((result) => result.status === 'indexed').length,
      failed: results.filter((result) => result.status === 'failed').length,
      results,
    };
  }

  query(
    dto: RagQueryDto,
    user: AuthenticatedUser,
    retrievalQuestion = dto.question,
    language?: string,
  ) {
    return this.answerWithSources(dto, user, retrievalQuestion, language);
  }

  hasAuthorizedDocumentReference(question: string, user: AuthenticatedUser) {
    return this.retrieverService.hasAuthorizedDocumentReference(question, user);
  }

  getAuthorizedDocumentCatalog(user: AuthenticatedUser) {
    return this.retrieverService.getAuthorizedDocumentCatalog(user);
  }

  private chunkText(text: string) {
    const normalized = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!normalized) return [];
    const size = 1200;
    const overlap = 180;
    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < normalized.length) {
      let end = Math.min(cursor + size, normalized.length);
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf(' ', end);
        if (boundary > cursor + size / 2) end = boundary;
      }
      chunks.push(normalized.slice(cursor, end).trim());
      if (end >= normalized.length) break;
      cursor = Math.max(end - overlap, cursor + 1);
    }
    return chunks;
  }

  private looksLikePromptInjection(question: string) {
    const normalized = question.toLowerCase();
    return [
      'ignore previous instructions',
      'ignore all instructions',
      'reveal system prompt',
      'show hidden prompt',
      'bypass security',
      'oublie les instructions',
      'ignore les instructions',
    ].some((pattern) => normalized.includes(pattern));
  }

  private languageInstruction(question: string, language?: string) {
    if (language === 'ar') return 'Reply in Arabic.';
    if (language === 'fr') return 'Reply in French.';
    if (language === 'en') return 'Reply in English.';
    if (/[\u0600-\u06ff]/.test(question)) return 'Reply in Arabic.';
    if (/\b(le|la|les|des|mon|ma|mes|quel|quelle|combien|salaire|conge)\b/i.test(question)) {
      return 'Reply in French.';
    }
    return 'Reply in English.';
  }

  private noSourceAnswer(question: string, language?: string) {
    const resolvedLanguage =
      language ??
      (/[\u0600-\u06ff]/.test(question)
        ? 'ar'
        : /\b(le|la|les|des|mon|ma|mes|quel|quelle|combien|salaire|conge|chez nous|resume|peux|veux)\b/i.test(question)
          ? 'fr'
          : 'en');
    if (resolvedLanguage === 'ar') {
      return 'لا أملك معلومات معتمدة أو مفهرسة كافية للإجابة على هذا السؤال.';
    }
    if (resolvedLanguage === 'fr') {
      return 'Je n’ai pas assez d’informations approuvées ou indexées pour répondre à cette question.';
    }
    return 'I do not have enough approved or indexed authorized information to answer that question.';
  }

  private vectorLiteral(values: number[]) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new BadRequestException('Embedding provider returned no vector values');
    }
    return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
  }
}
