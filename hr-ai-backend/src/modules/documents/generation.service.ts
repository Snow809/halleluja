import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../../services/storage/s3.service';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import { Readable } from 'stream';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
  ) {}

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async generateDocument(requestId: string) {
    const request = await this.prisma.hrRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { include: { department: true, position: true, manager: true } },
        template: true,
      }
    });

    if (!request || !request.template || request.kind !== 'DOCUMENT') {
      throw new Error('Invalid document request');
    }

    try {
      // 1. Fetch template from S3
      const templateStream = await this.s3.getFileStream(request.template.filePath);
      const templateBuffer = await this.streamToBuffer(templateStream as Readable);

      // 2. Load into Docxtemplater
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 3. Prepare variables
      const data = {
        employee_name: `${request.employee.firstName} ${request.employee.lastName}`,
        employee_position: request.employee.position?.title || 'Employé',
        department: request.employee.department?.name || 'Non assigné',
        manager_name: request.employee.manager ? `${request.employee.manager.firstName} ${request.employee.manager.lastName}` : 'Direction',
        date: new Date().toLocaleDateString('fr-FR'),
      };

      // 4. Render document
      doc.render(data);
      const generatedBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      // 5. Upload to S3
      const key = `generated/${request.employeeId}-${Date.now()}.docx`;
      await this.s3.uploadFile(key, generatedBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // 6. Save record
      await this.prisma.generatedDocument.create({
        data: {
          employeeId: request.employeeId,
          generatedBy: request.reviewedBy || request.employee.userId || 'system',
          validatedBy: request.reviewedBy,
          documentType: request.template.documentType,
          filePath: key,
          sizeBytes: generatedBuffer.length,
          fileType: 'DOCX',
          status: 'APPROVED',
        }
      });

      // Update request to reflect completion
      await this.prisma.hrRequest.update({
        where: { id: requestId },
        data: { note: 'Document generated successfully' }
      });

      if (request.employee.userId) {
        await this.notifications.create({
          userId: request.employee.userId,
          type: 'DOCUMENT',
          title: 'Document disponible',
          message: `${request.template.title} est prêt au téléchargement.`,
          resourceType: 'GeneratedDocument',
          resourceId: requestId,
        });
      }

      this.logger.log(`Document generated for request ${requestId}`);
    } catch (error) {
      this.logger.error(`Generation failed for request ${requestId}`, error);
      throw error;
    }
  }
}
