import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AcceptConsentDto } from './dto/accept-consent.dto';

export const CURRENT_TERMS_VERSION = '2026-06-security-demo';

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(user: AuthenticatedUser) {
    const current = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        termsAcceptedAt: true,
        termsVersion: true,
        consents: true,
      },
    });
    const accepted =
      current?.termsVersion === CURRENT_TERMS_VERSION && Boolean(current?.termsAcceptedAt);
    return {
      termsAccepted: accepted,
      requiredVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: current?.termsAcceptedAt,
      termsVersion: current?.termsVersion,
      consents: current?.consents ?? {},
    };
  }

  async acceptMine(user: AuthenticatedUser, dto: AcceptConsentDto) {
    if (!dto.termsAccepted || !dto.privacyAccepted || !dto.rightsNoticeAccepted) {
      throw new BadRequestException('All required terms must be accepted.');
    }
    const now = new Date();
    const consents = {
      termsAccepted: dto.termsAccepted,
      privacyAccepted: dto.privacyAccepted,
      rightsNoticeAccepted: dto.rightsNoticeAccepted,
      preferences: dto.preferences ?? {},
      acceptedAt: now.toISOString(),
      version: CURRENT_TERMS_VERSION,
    };
    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        termsAcceptedAt: now,
        termsVersion: CURRENT_TERMS_VERSION,
        consents: consents as Prisma.InputJsonObject,
      },
    });
    return this.getMine(user);
  }
}
