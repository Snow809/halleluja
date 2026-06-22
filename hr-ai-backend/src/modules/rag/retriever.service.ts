import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessPolicyService } from './access-policy.service';

@Injectable()
export class RetrieverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async retrieveRelevantChunks(question: string, user: AuthenticatedUser) {
    const actor = await this.accessPolicy.getActor(user);
    const visibility = this.authorizedVisibility(user, actor?.id);

    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        document: {
          status: 'APPROVED',
          OR: visibility,
        },
      },
      include: { document: true },
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
        };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
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

  private authorizedVisibility(user: AuthenticatedUser, actorId?: string) {
    const visibility: Prisma.HrDocumentWhereInput[] = [
      { visibility: 'PUBLIC' },
      { visibility: 'ROLE_RESTRICTED', allowedRoles: { has: user.role } },
    ];
    if (actorId) visibility.push({ visibility: 'EMPLOYEE_PRIVATE', employeeId: actorId });
    if (this.accessPolicy.isGlobalHr(user.role)) visibility.push({ visibility: 'EMPLOYEE_PRIVATE' });
    return visibility;
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
