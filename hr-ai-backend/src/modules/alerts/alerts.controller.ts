import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT)
  @Post()
  create(@Body() dto: CreateAlertDto, @CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.create(dto, user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT, UserRole.DIRECTION)
  @Get()
  findAll() {
    return this.alertsService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT, UserRole.DIRECTION)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alertsService.updateStatus(id, dto);
  }
}
