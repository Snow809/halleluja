import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DataErasureService } from './data-erasure.service';
import { CreateDataErasureRequestDto } from './dto/create-data-erasure-request.dto';
import { UpdateDataErasureRequestDto } from './dto/update-data-erasure-request.dto';

@ApiTags('data-erasure')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.ADMIN)
@Controller('data-erasure')
export class DataErasureController {
  constructor(private readonly dataErasureService: DataErasureService) {}

  @Get('candidates')
  candidates(@Query('search') search?: string) {
    return this.dataErasureService.candidates(search);
  }

  @Get('requests')
  requests() {
    return this.dataErasureService.listRequests();
  }

  @Post('requests')
  create(@Body() dto: CreateDataErasureRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dataErasureService.create(dto, user);
  }

  @Patch('requests/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDataErasureRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataErasureService.updateStatus(id, dto, user);
  }
}
