import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginHistoryService } from './login-history.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginHistoryService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
