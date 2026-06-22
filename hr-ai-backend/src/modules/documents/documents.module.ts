import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../services/storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { GenerationService } from './generation.service';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, StorageModule, RagModule, NotificationsModule],
  controllers: [TemplatesController, DocumentsController],
  providers: [DocumentsService, TemplatesService, GenerationService],
  exports: [DocumentsService, GenerationService, StorageModule],
})
export class DocumentsModule {}
