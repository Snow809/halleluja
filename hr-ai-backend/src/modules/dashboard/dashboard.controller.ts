import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('headcount')
  headcount(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.headcount(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION, UserRole.QVT, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('absenteeism')
  absenteeism(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.absenteeism(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get('turnover')
  turnover(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.turnover(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get('onboarding-progress')
  onboardingProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.onboardingProgress(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('ai-usage')
  aiUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.aiUsage(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT, UserRole.MANAGER)
  @Get('alerts-summary')
  alertsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.alertsSummary(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('recent-requests')
  recentRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.recentRequests(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION, UserRole.MANAGER)
  @Get('hiring-data')
  hiringData(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.hiringData(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.DIRECTION)
  @Get('team')
  teamMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.teamMembers(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.COLLABORATOR)
  @Get('team-perf')
  teamPerf(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.teamPerf(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.COLLABORATOR)
  @Get('weekly-output')
  weeklyOutput(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.weeklyOutput(user);
  }

  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR, UserRole.MANAGER, UserRole.HR)
  @Get('presence-data')
  presenceData(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.presenceData(user);
  }

  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR, UserRole.MANAGER, UserRole.HR)
  @Get('recent-activities')
  recentActivities(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.recentActivities(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get('hr-alerts')
  hrAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.hrAlerts(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('department-distribution')
  departmentDistribution(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.departmentDistribution(user);
  }
}
