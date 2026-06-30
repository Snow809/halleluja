import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../../services/storage/s3.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentPdfService } from './document-pdf.service';
import { TemplateDataService } from './template-data.service';
import { normalizeTemplateFieldSchema, replaceBracketLabelsWithDocxtemplaterTags } from './template-fields';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
    private readonly documentPdf: DocumentPdfService,
    private readonly templateData: TemplateDataService,
  ) {}

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async generateDocument(requestId: string) {
    const request = await this.prisma.hrRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { include: { department: true, position: true, manager: true } },
        template: true,
      },
    });

    if (!request || !request.template || request.kind !== 'DOCUMENT') {
      throw new Error('Invalid document request');
    }

    try {
      const templateStream = await this.s3.getFileStream(request.template.filePath);
      const templateBuffer = await this.streamToBuffer(templateStream as Readable);
      const fieldSchema = normalizeTemplateFieldSchema(request.template.fieldSchema);

      const legacyData = {
        employee_name: `${request.employee.firstName} ${request.employee.lastName}`,
        employee_email: request.employee.email,
        employee_phone: request.employee.phone || '',
        employee_address: request.employee.address || '',
        employee_number: request.employee.employeeNumber,
        employee_position: request.employee.position?.title || 'Employé',
        department: request.employee.department?.name || 'Non assigné',
        manager_name: request.employee.manager
          ? `${request.employee.manager.firstName} ${request.employee.manager.lastName}`
          : 'Direction',
        hire_date: request.employee.hireDate.toLocaleDateString('fr-FR'),
        salary: request.employee.salary?.toString() || '',
        request_note: request.note || '',
        date: new Date().toLocaleDateString('fr-FR'),
      };
      const data =
        fieldSchema.length > 0
          ? this.templateData.assertComplete(fieldSchema, request.employee, request.formData)
          : legacyData;
      const renderBuffer =
        fieldSchema.length > 0
          ? replaceBracketLabelsWithDocxtemplaterTags(templateBuffer, fieldSchema)
          : templateBuffer;

      const clearDocx = this.documentPdf.renderDocx(renderBuffer, data);
      const anonymizedDocx = this.documentPdf.renderDocx(
        renderBuffer,
        await this.documentPdf.anonymizeData(data),
      );
      const clearPdf = await this.documentPdf.convertDocxToPdf(
        clearDocx,
        `${request.template.documentType}-clear.docx`,
      );
      const anonymizedPdf = await this.documentPdf.convertDocxToPdf(
        anonymizedDocx,
        `${request.template.documentType}-anonymized.docx`,
      );

      const stamp = Date.now();
      const clearKey = `generated/clear/${request.employeeId}-${stamp}.pdf`;
      const anonymizedKey = `generated/anonymized/${request.employeeId}-${stamp}.pdf`;
      await this.s3.uploadFile(clearKey, clearPdf, 'application/pdf');
      await this.s3.uploadFile(anonymizedKey, anonymizedPdf, 'application/pdf');

      const generatedBy = request.reviewedBy || request.employee.userId;
      if (!generatedBy) {
        throw new Error('No user is available to own generated document audit metadata');
      }

      const generated = await this.prisma.generatedDocument.create({
        data: {
          employeeId: request.employeeId,
          generatedBy,
          validatedBy: request.reviewedBy,
          documentType: request.template.documentType,
          filePath: anonymizedKey,
          clearFilePath: clearKey,
          anonymizedFilePath: anonymizedKey,
          sizeBytes: anonymizedPdf.length,
          fileType: 'PDF',
          status: 'APPROVED',
        },
      });

      await this.prisma.hrRequest.update({
        where: { id: requestId },
        data: { note: 'Document generated successfully' },
      });

      if (request.employee.userId) {
        await this.notifications.create({
          userId: request.employee.userId,
          type: 'DOCUMENT',
          title: 'Document disponible',
          message: `${request.template.title} est prêt au téléchargement.`,
          resourceType: 'GeneratedDocument',
          resourceId: generated.id,
        });
      }

      this.logger.log(`Document generated for request ${requestId}`);
      return generated;
    } catch (error) {
      this.logger.error(`Generation failed for request ${requestId}`, error);
      throw error;
    }
  }
}
