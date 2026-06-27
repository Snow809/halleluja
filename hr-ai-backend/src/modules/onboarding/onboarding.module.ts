import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LlmModule } from '../../services/llm/llm.module';

@Module({
  imports: [NotificationsModule, LlmModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
