import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRiskAlertsService } from './employee-risk-alerts.service';

@ApiTags('employee-risk-alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('employee-risk-alerts')
export class EmployeeRiskAlertsController {
  constructor(private readonly service: EmployeeRiskAlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Patch(':id/follow-up')
  followUp(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.followUp(id, note, user);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.resolve(id, user);
  }
}
