import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('import')
  importEmployees(@Body() dto: ImportEmployeesDto) {
    return this.employeesService.importEmployees(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('me/vacations')
  getMyVacations(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getMyVacationRequests(user.email);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('me/vacations')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 5 * 1024 * 1024 } }))
  createVacation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    return this.employeesService.createVacationRequest(user.email, dto, attachment);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get('requests')
  getRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
  ) {
    return this.employeesService.getScopedRequests(user, status, kind);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('me/documents/requests')
  getMyDocumentRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getMyDocumentRequests(user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('me/documents')
  getMyDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getMyDocuments(user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('me/documents/requests')
  createDocumentRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentRequestDto) {
    return this.employeesService.createDocumentRequest(user.userId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Patch('requests/:id/status')
  updateRequestStatus(@Param('id') id: string, @Body() dto: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; comment?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateRequestStatus(id, dto.status, user, dto.comment);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Post('absences')
  createAbsence(@Body() dto: any) {
    return this.employeesService.createAbsence(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('requests/:id/attachment')
  getRequestAttachment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getRequestAttachment(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('meta/departments')
  getDepartments() {
    return this.employeesService.getDepartments();
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('meta/positions')
  getPositions() {
    return this.employeesService.getPositions();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findOne(id, user);
  }
}
