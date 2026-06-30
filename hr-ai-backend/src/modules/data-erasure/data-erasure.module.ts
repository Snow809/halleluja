import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DataErasureController } from './data-erasure.controller';
import { DataErasureService } from './data-erasure.service';

@Module({
  imports: [AuditModule],
  controllers: [DataErasureController],
  providers: [DataErasureService],
})
export class DataErasureModule {}
