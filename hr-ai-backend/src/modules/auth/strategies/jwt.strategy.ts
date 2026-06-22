import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/config.service';
import { RedisService } from '../../../common/redis/redis.service';
import { PrismaService } from '../../../database/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  fullName?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    
    if (token) {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const current = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });
    if (!current || current.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    return {
      userId: current.id,
      email: current.email,
      role: current.roles[0]?.role.name ?? 'COLLABORATOR',
      fullName: current.fullName,
    };
  }
}
