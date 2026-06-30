import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { RagService } from '../rag/rag.service';
import { S3Service } from '../../services/storage/s3.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly auditService: AuditService,
    private readonly ragService: RagService,
  ) {}

  async upload(dto: CreateDocumentDto, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'bin';
    const filePath = `hr-documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    await this.s3.uploadFile(filePath, file.buffer, file.mimetype);
    return this.prisma.hrDocument.create({
      data: {
        title: dto.title,
        category: dto.category || 'General',
        documentType: dto.category || 'HR Document',
        filePath,
        uploadedBy: user.userId,
        sizeBytes: file.size,
        fileType: file.originalname.split('.').pop()?.toUpperCase() || 'PDF',
        employeeId: dto.employeeId,
        visibility: dto.visibility ?? (dto.employeeId ? 'EMPLOYEE_PRIVATE' : 'ROLE_RESTRICTED'),
        allowedRoles:
          dto.visibility === 'PUBLIC'
            ? []
            : dto.allowedRoles?.split(',').map((role) => role.trim()).filter(Boolean) ?? ['ADMIN', 'HR'],
        isPublic: dto.visibility === 'PUBLIC',
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
    filters: {
      status?: string;
      visibility?: string;
      category?: string;
      fileType?: string;
      indexedStatus?: string;
    } = {},
  ) {
    const scopedWhere = await this.visibilityFilter(user);
    const where: Prisma.HrDocumentWhereInput = {
      AND: [
        scopedWhere,
        filters.status ? { status: filters.status as any } : {},
        filters.visibility ? { visibility: filters.visibility as any } : {},
        filters.category ? { category: { contains: filters.category, mode: 'insensitive' } } : {},
        filters.fileType ? { fileType: filters.fileType.toUpperCase() } : {},
        filters.indexedStatus ? { indexedStatus: filters.indexedStatus as any } : {},
      ],
    };
    const documents = await this.prisma.hrDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
    return documents.map((document) => this.withIndexingMetadata(document));
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.hrDocument.findFirst({
      where: { id, ...(await this.visibilityFilter(user)) },
      include: { _count: { select: { chunks: true } } },
    });
    if (!document) throw new NotFoundException('Document not found');
    return this.withIndexingMetadata(document);
  }

  async validate(id: string, dto: ValidateDocumentDto, user: AuthenticatedUser) {
    const document = await this.prisma.hrDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
    try {
      await this.ragService.indexDocument(id);
    } catch (error) {
      await this.prisma.hrDocument.update({
        where: { id },
        data: { status: 'PENDING_REVIEW' },
      });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new UnprocessableEntityException(
        `Document indexing failed: ${error instanceof Error ? error.message : 'unsupported or unreadable file'}`,
      );
    }
    await this.auditService.logDocumentValidation(user.userId, id, { comment: dto.comment });
    return document;
  }

  async archive(id: string, user?: AuthenticatedUser) {
    const document = await this.prisma.hrDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.ragService.removeDocumentIndex(id);
    await this.auditService.log(user?.userId, 'DOCUMENT_ARCHIVE', 'HrDocument', id, 'SUCCESS');
    return document;
  }

  async getDownload(id: string, user: AuthenticatedUser) {
    const document = await this.findOne(id, user);
    if (document.status !== 'APPROVED') throw new NotFoundException('Document not available');
    await this.prisma.hrDocument.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    await this.auditService.log(user.userId, 'DOCUMENT_DOWNLOAD', 'HrDocument', id, 'SUCCESS');
    return {
      url: await this.s3.getPresignedUrl(document.filePath, 300),
      fileName: `${document.title}.${document.fileType.toLowerCase()}`,
      fileType: document.fileType,
      previewable: document.fileType.toUpperCase() === 'PDF',
    };
  }

  async getPreview(id: string, user: AuthenticatedUser) {
    const document = await this.findOne(id, user);
    if (document.status !== 'APPROVED') throw new NotFoundException('Document not available');
    const previewable = document.fileType.toUpperCase() === 'PDF';
    await this.auditService.log(user.userId, 'DOCUMENT_PREVIEW', 'HrDocument', id, 'SUCCESS', { previewable });
    return {
      url: previewable ? await this.s3.getPresignedUrl(document.filePath, 300) : null,
      fileName: `${document.title}.${document.fileType.toLowerCase()}`,
      fileType: document.fileType,
      previewable,
    };
  }

  async exportCsv(user: AuthenticatedUser, filters: Parameters<DocumentsService['findAll']>[1] = {}) {
    const documents = await this.findAll(user, filters);
    const header = ['createdAt', 'title', 'category', 'status', 'visibility', 'fileType', 'indexedStatus', 'chunkCount'];
    const rows = documents.map((document) => [
      document.createdAt.toISOString(),
      document.title,
      document.category,
      document.status,
      document.visibility,
      document.fileType,
      document.indexedStatus,
      document.chunkCount ?? 0,
    ]);
    return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private withIndexingMetadata<T extends { _count?: { chunks: number } }>(document: T) {
    const { _count, ...rest } = document;
    return { ...rest, chunkCount: _count?.chunks ?? 0 };
  }

  private async visibilityFilter(user: AuthenticatedUser): Promise<Prisma.HrDocumentWhereInput> {
    if (user.role === 'ADMIN' || user.role === 'HR') return {};
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const rules: Prisma.HrDocumentWhereInput[] = [
      { visibility: 'PUBLIC' },
      { visibility: 'ROLE_RESTRICTED', allowedRoles: { has: user.role } },
    ];
    if (employee) {
      rules.push({ visibility: 'EMPLOYEE_PRIVATE', employeeId: employee.id });
    }
    return { OR: rules };
  }
}
