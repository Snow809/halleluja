import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('documents/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    // HR and Admins can see all, employees only active
    const canSeeInactive = user.role === 'HR' || user.role === 'ADMIN';
    return this.templatesService.findAll(canSeeInactive, user.userId);
  }

  @Post()
  @Roles(UserRole.HR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  create(@CurrentUser() user: any, @Body() body: any, @UploadedFile() file: Express.Multer.File) {
    return this.templatesService.create(user.userId, body, file);
  }

  @Patch(':id')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: UpdateTemplateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.templatesService.update(id, body, file, user.userId);
  }

  @Get(':id/fields')
  @Roles(UserRole.HR, UserRole.ADMIN)
  getFields(@Param('id') id: string) {
    return this.templatesService.getFields(id);
  }

  @Patch(':id/fields')
  @Roles(UserRole.HR, UserRole.ADMIN)
  updateFields(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { fields: unknown }) {
    return this.templatesService.updateFields(id, body.fields, user.userId);
  }

  @Patch(':id/active')
  @Roles(UserRole.HR, UserRole.ADMIN)
  toggleActive(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.templatesService.toggleActive(id, body.isActive, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.HR, UserRole.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.templatesService.delete(id, user.userId);
  }
}
