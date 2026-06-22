import { Module } from '@nestjs/common';
import { DocumentIndexingProcessor } from './processors/document-indexing.processor';
import { PredictionProcessor } from './processors/prediction.processor';

@Module({
  providers: [DocumentIndexingProcessor, PredictionProcessor],
  exports: [DocumentIndexingProcessor, PredictionProcessor],
})
export class WorkersModule {}
