import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RagModule } from '../rag/rag.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatActionService } from './chat-action.service';
import { EmployeesModule } from '../employees/employees.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { LlmModule } from '../../services/llm/llm.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [AuditModule, RagModule, EmployeesModule, OnboardingModule, LlmModule, DocumentsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatActionService],
})
export class ChatModule {}
