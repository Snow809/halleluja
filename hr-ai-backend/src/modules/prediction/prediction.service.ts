import { Injectable } from '@nestjs/common';

@Injectable()
export class PredictionService {
  workforceProjection() {
    return this.futurePlaceholder('workforce-projection');
  }

  turnoverRisk() {
    return this.futurePlaceholder('turnover-risk');
  }

  absenteeismTrend() {
    return this.futurePlaceholder('absenteeism-trend');
  }

  private futurePlaceholder(type: string) {
    return {
      type,
      status: 'future-placeholder',
      data: [],
      note: 'Not part of the MVP. Implement only after enough clean historical HR data exists.',
    };
  }
}
