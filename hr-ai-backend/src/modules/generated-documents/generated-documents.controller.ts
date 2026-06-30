import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GeneratedDocumentsService } from './generated-documents.service';
import { RejectGeneratedDocumentDto } from './dto/reject-generated-document.dto';
import { RequestGeneratedDocumentDto } from './dto/request-generated-document.dto';
import { ValidateGeneratedDocumentDto } from './dto/validate-generated-document.dto';

@ApiTags('generated-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('generated-documents')
export class GeneratedDocumentsController {
  constructor(private readonly generatedDocumentsService: GeneratedDocumentsService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Post('request')
  request(@Body() dto: RequestGeneratedDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocumentsService.request(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post(':id/generate-draft')
  generateDraft(@Param('id') id: string) {
    return this.generatedDocumentsService.generateDraft(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch(':id/validate')
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateGeneratedDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.generatedDocumentsService.validate(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectGeneratedDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.generatedDocumentsService.reject(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocumentsService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get(':id/preview')
  preview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocumentsService.preview(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get(':id/download')
  download(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocumentsService.download(id, user);
  }
}
