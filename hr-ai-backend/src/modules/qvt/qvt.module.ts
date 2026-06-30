import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { QvtController } from './qvt.controller';
import { QvtService } from './qvt.service';

@Module({
  imports: [PrismaModule],
  controllers: [QvtController],
  providers: [QvtService],
})
export class QvtModule {}
