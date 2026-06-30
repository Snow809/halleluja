import { Module } from '@nestjs/common';
import { PresidioService } from './presidio.service';

@Module({
  providers: [PresidioService],
  exports: [PresidioService],
})
export class AnonymizationModule {}
