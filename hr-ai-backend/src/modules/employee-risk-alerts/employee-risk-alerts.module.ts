import { Module } from '@nestjs/common';
import { EmployeeRiskAlertsController } from './employee-risk-alerts.controller';
import { EmployeeRiskAlertsService } from './employee-risk-alerts.service';

@Module({
  controllers: [EmployeeRiskAlertsController],
  providers: [EmployeeRiskAlertsService],
})
export class EmployeeRiskAlertsModule {}
