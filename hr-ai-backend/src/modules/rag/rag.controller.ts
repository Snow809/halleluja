import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagService } from './rag.service';

@ApiTags('rag')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('query')
  query(@Body() dto: RagQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ragService.query(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('index-document/:documentId')
  indexDocument(@Param('documentId') documentId: string) {
    return this.ragService.indexDocument(documentId);
  }
}
