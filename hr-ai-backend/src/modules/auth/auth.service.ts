import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfigService } from '../../config/config.service';
import { LoginHistoryService } from './login-history.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly config: AppConfigService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      // Record failed login attempt
      await this.loginHistoryService.recordFailedLogin(dto.email, ip, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      // Record failed login attempt
      await this.loginHistoryService.recordFailedLogin(dto.email, ip, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Record successful login
    await this.loginHistoryService.recordLogin(user.id, user.email, ip, userAgent);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.roles?.[0]?.role?.name || 'COLLABORATOR',
      fullName: user.fullName || user.email.split('@')[0],
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiresIn,
    });

    await this.redisService.storeRefreshToken(refreshToken, this.parseExpires(this.config.jwtRefreshExpiresIn));

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshToken = dto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.redisService.isRefreshTokenValid(refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redisService.revokeRefreshToken(refreshToken);

    const newAccessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    const newRefreshToken = await this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    }, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiresIn,
    });

    await this.redisService.storeRefreshToken(newRefreshToken, this.parseExpires(this.config.jwtRefreshExpiresIn));

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
    };
  }

  async logout(token: string, refreshToken?: string) {
    const accessExpiration = this.parseExpires(this.config.jwtExpiresIn);
    await this.redisService.blacklistToken(token, accessExpiration);

    if (refreshToken) {
      await this.redisService.revokeRefreshToken(refreshToken);
    }

    return {
      message: 'Successfully logged out. Token has been revoked.',
    };
  }

  // ── Forgot password ──────────────────────────────────────────────────
  async requestPasswordReset(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal whether the email exists (security best practice)
      return { resetToken: null, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été généré.' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: '15m',
      },
    );

    // Store in Redis so it can be validated and revoked
    await this.redisService.storeRefreshToken(resetToken, 15 * 60);

    return {
      resetToken,
      message: 'Token de réinitialisation généré. Valide 15 minutes.',
    };
  }

  // ── Reset password ────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    // Verify the token exists in Redis
    const isValid = await this.redisService.isRefreshTokenValid(dto.token);
    if (!isValid) {
      throw new UnauthorizedException('Token invalide ou expiré.');
    }

    // Decode the JWT
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const newHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Revoke the reset token so it can't be reused
    await this.redisService.revokeRefreshToken(dto.token);

    return { message: 'Mot de passe mis à jour avec succès.' };
  }

  private parseExpires(duration: string): number {
    const match = /^([0-9]+)([smhd])$/.exec(duration);
    if (!match) {
      const seconds = Number(duration);
      return Number.isFinite(seconds) && seconds > 0 ? seconds : 86400;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return value;
    }
  }
  async getMeWithDetails(user: AuthenticatedUser) {
    let employee = await this.prisma.employee.findUnique({
      where: { email: user.email },
      include: {
        requests: {
          where: { kind: 'VACATION' },
          orderBy: { createdAt: 'desc' }
        },
        department: true,
        position: true,
      },
    });

    if (!employee) {
      employee = await this.prisma.employee.create({
        data: {
          employeeNumber: 'EMP-' + user.userId.substring(0, 5).toUpperCase(),
          firstName: user.fullName ? user.fullName.split(' ')[0] : user.email.split('@')[0],
          lastName: user.fullName && user.fullName.split(' ').length > 1 ? user.fullName.split(' ').slice(1).join(' ') : 'Utilisateur',
          email: user.email,
          salary: 0,
          hireDate: new Date(),
          userId: user.userId,
          vacationBalanceDays: 25,
          rttBalanceDays: 10,
        },
        include: {
          requests: true,
          department: true,
          position: true,
        },
      });
    }

    return {
      ...user,
      employee,
    };
  }
}
