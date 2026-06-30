import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessPolicyService } from './access-policy.service';
import { EmbeddingsService } from '../../services/embeddings/embeddings.service';

export interface RetrievedChunk {
  documentId: string;
  title: string;
  content: string;
  sourcePage?: number;
  chunkOrder: number;
  score: number;
  degradedRetrieval?: boolean;
}

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async retrieveRelevantChunks(
    question: string,
    user: AuthenticatedUser,
  ): Promise<RetrievedChunk[]> {
    const actor = await this.accessPolicy.getActor(user);

    try {
      const embedding = await this.embeddings.generateEmbedding(question, 'RETRIEVAL_QUERY');
      const vector = this.vectorLiteral(embedding.embedding);
      const rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          title: string;
          content: string;
          sourcePage: number | null;
          chunkOrder: number;
          score: number;
        }>
      >`
        SELECT
          c."documentId" AS "documentId",
          d."title" AS "title",
          c."chunkText" AS "content",
          c."sourcePage" AS "sourcePage",
          c."chunkOrder" AS "chunkOrder",
          1 - (c."embedding" <=> ${vector}::vector) AS "score"
        FROM "DocumentChunk" c
        JOIN "HrDocument" d ON d."id" = c."documentId"
        WHERE c."embedding" IS NOT NULL
          AND d."status" = 'APPROVED'
          AND ${this.authorizedDocumentSql(user, actor?.id)}
        ORDER BY c."embedding" <=> ${vector}::vector
        LIMIT 5
      `;

      return rows.map((row) => ({
        documentId: row.documentId,
        title: row.title,
        content: row.content,
        sourcePage: row.sourcePage ?? undefined,
        chunkOrder: row.chunkOrder,
        score: Number(row.score ?? 0),
      }));
    } catch (error) {
      this.logger.warn(
        `pgvector retrieval unavailable; using authorized lexical fallback: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return this.retrieveLexically(question, user, actor?.id);
    }
  }

  async hasAuthorizedDocumentReference(question: string, user: AuthenticatedUser) {
    const documents = await this.getAuthorizedDocumentCatalog(user);
    const normalizedQuestion = this.normalize(question);
    return documents.some((document) => {
      const normalizedTitle = this.normalize(document.title).trim();
      return normalizedTitle.length >= 3 && normalizedQuestion.includes(normalizedTitle);
    });
  }

  async getAuthorizedDocumentCatalog(user: AuthenticatedUser) {
    const actor = await this.accessPolicy.getActor(user);
    return this.prisma.hrDocument.findMany({
      where: {
        status: 'APPROVED',
        OR: this.authorizedVisibility(user, actor?.id),
      },
      select: { title: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async retrieveLexically(
    question: string,
    user: AuthenticatedUser,
    actorId?: string,
  ): Promise<RetrievedChunk[]> {
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        document: {
          status: 'APPROVED',
          OR: this.authorizedVisibility(user, actorId),
        },
      },
      include: { document: true },
      take: 200,
    });

    const queryTokens = Array.from(this.tokens(question));
    return chunks
      .map((chunk) => {
        const textTokens = this.tokens(chunk.chunkText);
        const overlap = queryTokens.filter((token) => textTokens.has(token)).length;
        const normalizedQuestion = this.normalize(question);
        const phraseBonus = this.normalize(chunk.chunkText).includes(normalizedQuestion) ? 5 : 0;
        const metadataBonus =
          queryTokens.filter((token) =>
            this.normalize(`${chunk.document.title} ${chunk.document.category}`).includes(token),
          ).length * 2;
        return {
          documentId: chunk.documentId,
          title: chunk.document.title,
          content: chunk.chunkText,
          sourcePage: chunk.sourcePage ?? undefined,
          chunkOrder: chunk.chunkOrder,
          score: overlap + phraseBonus + metadataBonus,
          degradedRetrieval: true,
        };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private authorizedVisibility(user: AuthenticatedUser, actorId?: string) {
    const visibility: Prisma.HrDocumentWhereInput[] = [
      { visibility: 'PUBLIC' },
      { isPublic: true },
      { visibility: 'ROLE_RESTRICTED', allowedRoles: { has: user.role } },
    ];
    if (actorId) visibility.push({ visibility: 'EMPLOYEE_PRIVATE', employeeId: actorId });
    if (this.accessPolicy.isGlobalHr(user.role)) visibility.push({ visibility: 'EMPLOYEE_PRIVATE' });
    return visibility;
  }

  private authorizedDocumentSql(user: AuthenticatedUser, actorId?: string) {
    const fragments: Prisma.Sql[] = [
      Prisma.sql`d."visibility" = 'PUBLIC'`,
      Prisma.sql`d."isPublic" = true`,
      Prisma.sql`(d."visibility" = 'ROLE_RESTRICTED' AND ${user.role} = ANY(d."allowedRoles"))`,
    ];

    if (this.accessPolicy.isGlobalHr(user.role)) {
      fragments.push(Prisma.sql`d."visibility" = 'EMPLOYEE_PRIVATE'`);
    } else if (actorId) {
      fragments.push(
        Prisma.sql`(d."visibility" = 'EMPLOYEE_PRIVATE' AND d."employeeId" = ${actorId})`,
      );
    }

    return Prisma.sql`(${Prisma.join(fragments, ' OR ')})`;
  }

  private vectorLiteral(values: number[]) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Embedding provider returned no vector values');
    }
    return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
  }

  private tokens(value: string) {
    return new Set(
      this.normalize(value)
        .split(/[^a-z0-9\u0600-\u06ff]+/)
        .filter((token) => token.length > 2),
    );
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
