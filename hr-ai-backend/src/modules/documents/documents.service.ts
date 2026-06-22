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

  async findAll(user: AuthenticatedUser) {
    return this.prisma.hrDocument.findMany({
      where: await this.visibilityFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.hrDocument.findFirst({
      where: { id, ...(await this.visibilityFilter(user)) },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
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

  async archive(id: string) {
    const document = await this.prisma.hrDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.ragService.removeDocumentIndex(id);
    return document;
  }

  async getDownload(id: string, user: AuthenticatedUser) {
    const document = await this.findOne(id, user);
    if (document.status !== 'APPROVED') throw new NotFoundException('Document not available');
    await this.prisma.hrDocument.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    return {
      url: await this.s3.getPresignedUrl(document.filePath, 300),
      fileName: `${document.title}.${document.fileType.toLowerCase()}`,
      fileType: document.fileType,
    };
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
