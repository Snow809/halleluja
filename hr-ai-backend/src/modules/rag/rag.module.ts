import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmbeddingsModule } from '../../services/embeddings/embeddings.module';
import { LlmModule } from '../../services/llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RetrieverService } from './retriever.service';
import { DocumentParserModule } from '../../services/document-parser/document-parser.module';
import { AccessPolicyService } from './access-policy.service';
import { HrContextService } from './hr-context.service';
import { StorageModule } from '../../services/storage/storage.module';

@Module({
  imports: [AuditModule, EmbeddingsModule, LlmModule, DocumentParserModule, StorageModule],
  controllers: [RagController],
  providers: [RagService, RetrieverService, AccessPolicyService, HrContextService],
  exports: [RagService, AccessPolicyService],
})
export class RagModule {}
