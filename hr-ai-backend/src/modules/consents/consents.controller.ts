import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { ConsentsService } from './consents.service';

@ApiTags('consents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.consentsService.getMine(user);
  }

  @Post('me')
  acceptMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptConsentDto) {
    return this.consentsService.acceptMine(user, dto);
  }
}
