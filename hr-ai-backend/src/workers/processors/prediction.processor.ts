import { Injectable } from '@nestjs/common';

@Injectable()
export class PredictionProcessor {
  async handle() {
    return {
      status: 'future-placeholder',
      note: 'Prediction jobs are outside the MVP and require clean historical data first.',
    };
  }
}
