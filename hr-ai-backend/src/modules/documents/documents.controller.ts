import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { DocumentsService } from './documents.service';
import { S3Service } from '../../services/storage/s3.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(dto, file, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('category') category?: string,
    @Query('fileType') fileType?: string,
    @Query('indexedStatus') indexedStatus?: string,
  ) {
    return this.documentsService.findAll(user, { status, visibility, category, fileType, indexedStatus });
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="documents.csv"')
  exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('category') category?: string,
    @Query('fileType') fileType?: string,
    @Query('indexedStatus') indexedStatus?: string,
  ) {
    return this.documentsService.exportCsv(user, { status, visibility, category, fileType, indexedStatus });
  }

  @Get('download/:id')
  async downloadDocument(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const doc = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document non trouvé');

    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (
      doc.status !== 'APPROVED' ||
      (doc.employeeId !== employee?.id && user.role !== 'HR' && user.role !== 'ADMIN')
    ) {
      throw new NotFoundException('Document non trouvé ou accès refusé');
    }

    return { url: await this.s3Service.getPresignedUrl(doc.filePath, 300) };
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }

  @Roles(UserRole.HR, UserRole.ADMIN)
  @Patch(':id/validate')
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.validate(id, dto, user);
  }

  @Roles(UserRole.HR, UserRole.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.archive(id, user);
  }

  @Get(':id/download')
  getDownload(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.getDownload(id, user);
  }

  @Get(':id/preview')
  getPreview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.getPreview(id, user);
  }
}
