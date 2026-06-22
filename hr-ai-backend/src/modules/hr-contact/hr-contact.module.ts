import { Module } from '@nestjs/common';
import { HrContactController } from './hr-contact.controller';
import { HrContactService } from './hr-contact.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [HrContactController],
  providers: [HrContactService],
})
export class HrContactModule {}
