import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { QvtService } from './qvt.service';

@ApiTags('qvt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qvt')
export class QvtController {
  constructor(private readonly qvt: QvtService) {}

  @Roles(UserRole.QVT)
  @Get('summary')
  summary() {
    return this.qvt.companySummary();
  }

  @Roles(UserRole.QVT)
  @Get('departments/breakdown')
  departmentBreakdown() {
    return this.qvt.departmentBreakdown();
  }

  @Roles(UserRole.QVT)
  @Get('departments')
  department(@Query('departmentId') departmentId?: string) {
    return this.qvt.departmentSummary(departmentId);
  }

  @Roles(UserRole.MANAGER)
  @Get('manager/team-summary')
  teamSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.qvt.managerTeamSummary(user);
  }

  @Roles(UserRole.QVT)
  @Post('predictions/recompute')
  recompute() {
    return this.qvt.recomputeSnapshots();
  }
}
