import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { HrContactStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateHrContactDto } from './dto/create-hr-contact.dto';
import { HrContactService } from './hr-contact.service';

@ApiTags('hr-contact-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr-contact-requests')
export class HrContactController {
  constructor(private readonly service: HrContactService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrContactDto) {
    return this.service.create(user.userId, dto);
  }

  @Roles(UserRole.HR)
  @Get()
  list() {
    return this.service.list();
  }

  @Roles(UserRole.HR)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: HrContactStatus) {
    return this.service.updateStatus(id, status);
  }
}
