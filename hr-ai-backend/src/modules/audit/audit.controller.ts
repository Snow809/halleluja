import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.audit.findMany(user, { actor, action, resourceType, status, dateFrom, dateTo, resourceId });
  }

  @Roles(UserRole.ADMIN)
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.audit.exportCsv(user, { actor, action, resourceType, status, dateFrom, dateTo, resourceId });
  }
}
