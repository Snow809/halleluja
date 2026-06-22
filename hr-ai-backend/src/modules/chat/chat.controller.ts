import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('ask')
  ask(@Body() dto: AskQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.ask(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('conversations')
  findConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findConversations(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('conversations/:id')
  findConversation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findConversation(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('supervision/messages')
  supervision(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.supervision(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('supervision/summary')
  supervisionSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.supervisionSummary(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Post('actions/:id/confirm')
  confirmAction(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    return this.chatService.confirmAction(id, user, attachment);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('actions/:id/cancel')
  cancelAction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.cancelAction(id, user);
  }
}
