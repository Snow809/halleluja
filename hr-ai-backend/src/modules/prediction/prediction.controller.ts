import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PredictionService } from './prediction.service';

@ApiTags('prediction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Roles(UserRole.ADMIN, UserRole.DIRECTION)
  @Get('workforce-projection')
  workforceProjection() {
    return this.predictionService.workforceProjection();
  }

  @Roles(UserRole.ADMIN, UserRole.DIRECTION)
  @Get('turnover-risk')
  turnoverRisk() {
    return this.predictionService.turnoverRisk();
  }

  @Roles(UserRole.ADMIN, UserRole.DIRECTION)
  @Get('absenteeism-trend')
  absenteeismTrend() {
    return this.predictionService.absenteeismTrend();
  }
}
