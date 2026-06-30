import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { GeneratedDocumentsModule } from './modules/generated-documents/generated-documents.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PredictionModule } from './modules/prediction/prediction.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './services/storage/storage.module';
import { LlmModule } from './services/llm/llm.module';
import { EmbeddingsModule } from './services/embeddings/embeddings.module';
import { DocumentParserModule } from './services/document-parser/document-parser.module';
import { WorkersModule } from './workers/workers.module';
import { RedisModule } from './common/redis/redis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HrContactModule } from './modules/hr-contact/hr-contact.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { DataErasureModule } from './modules/data-erasure/data-erasure.module';
import { QvtModule } from './modules/qvt/qvt.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    DocumentsModule,
    RagModule,
    ChatModule,
    GeneratedDocumentsModule,
    OnboardingModule,
    DashboardModule,
    AlertsModule,
    PredictionModule,
    AuditModule,
    StorageModule,
    LlmModule,
    EmbeddingsModule,
    DocumentParserModule,
    WorkersModule,
    RedisModule,
    NotificationsModule,
    HrContactModule,
    ConsentsModule,
    DataErasureModule,
    QvtModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
