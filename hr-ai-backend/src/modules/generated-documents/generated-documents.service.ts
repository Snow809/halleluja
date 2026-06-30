import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LlmService } from '../../services/llm/llm.service';
import { AuditService } from '../audit/audit.service';
import { RequestGeneratedDocumentDto } from './dto/request-generated-document.dto';
import { RejectGeneratedDocumentDto } from './dto/reject-generated-document.dto';
import { ValidateGeneratedDocumentDto } from './dto/validate-generated-document.dto';
import { S3Service } from '../../services/storage/s3.service';

@Injectable()
export class GeneratedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly auditService: AuditService,
    private readonly s3: S3Service,
  ) {}

  private mapToAppStatus(doc: any) {
    if (!doc) return doc;
    let appStatus = 'DRAFT';
    if (doc.status === 'PENDING_REVIEW') appStatus = 'IN_REVIEW';
    if (doc.status === 'APPROVED') appStatus = 'VALIDATED';
    if (doc.status === 'ARCHIVED') appStatus = 'REJECTED';
    return {
      ...doc,
      status: appStatus,
      type: doc.documentType,
      requestedByUserId: doc.generatedBy,
      validatedByUserId: doc.validatedBy,
    };
  }

  async request(dto: RequestGeneratedDocumentDto, user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');
    const completion = await this.llmService.generateDraft(
      `Document type: ${dto.type}\nRequest: ${dto.prompt}\nDraft only the requested document.`,
    );
    const body = Buffer.from(completion.content, 'utf8');
    const filePath = `generated/draft-${employee.id}-${Date.now()}.txt`;
    await this.s3.uploadFile(filePath, body, 'text/plain; charset=utf-8');

    const doc = await this.prisma.generatedDocument.create({
      data: {
        employeeId: employee.id,
        generatedBy: user.userId,
        documentType: dto.type,
        filePath,
        sizeBytes: body.length,
        fileType: 'TXT',
        status: 'DRAFT',
      },
    });
    return this.mapToAppStatus(doc);
  }

  async generateDraft(id: string) {
    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
      },
    });
    return this.mapToAppStatus(doc);
  }

  async validate(id: string, dto: ValidateGeneratedDocumentDto, user: AuthenticatedUser) {
    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        validatedBy: user.userId,
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'validate',
      comment: dto.comment,
    });
    return this.mapToAppStatus(doc);
  }

  async reject(id: string, dto: RejectGeneratedDocumentDto, user: AuthenticatedUser) {
    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'reject',
      reason: dto.reason,
    });
    return this.mapToAppStatus(doc);
  }

  async findAll(user: AuthenticatedUser) {
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const where =
      user.role === 'ADMIN' || user.role === 'HR'
        ? {}
        : user.role === 'MANAGER' && actor
          ? { employee: { managerId: actor.id } }
          : { employeeId: actor?.id ?? 'none' };
    const docs = await this.prisma.generatedDocument.findMany({ where });
    return docs.map(doc => this.mapToAppStatus(doc));
  }

  async preview(id: string, user: AuthenticatedUser) {
    return this.getSignedAccess(id, user, false);
  }

  async download(id: string, user: AuthenticatedUser) {
    return this.getSignedAccess(id, user, true);
  }

  private async getSignedAccess(id: string, user: AuthenticatedUser, incrementDownload: boolean) {
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const document = await this.prisma.generatedDocument.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!document || document.status !== 'APPROVED') {
      throw new NotFoundException('Document not found');
    }

    const isOwner = document.employeeId === actor?.id;
    const isPrivileged = user.role === 'ADMIN' || user.role === 'HR';
    const isDirectReport = user.role === 'MANAGER' && document.employee.managerId === actor?.id;
    if (!isOwner && !isPrivileged && !isDirectReport) {
      throw new ForbiddenException('Document access denied');
    }

    const isAnonymized = !isOwner;
    const filePath = isAnonymized
      ? document.anonymizedFilePath || document.filePath
      : document.clearFilePath || document.filePath;
    if (incrementDownload) {
      await this.prisma.generatedDocument.update({
        where: { id },
        data: { downloads: { increment: 1 } },
      });
    }

    return {
      id,
      status: 'ready',
      url: await this.s3.getPresignedUrl(filePath, 300),
      fileName: `${document.documentType}.${document.fileType.toLowerCase()}`,
      fileType: document.fileType,
      previewable: document.fileType.toUpperCase() === 'PDF',
      anonymized: isAnonymized,
    };
  }
}
