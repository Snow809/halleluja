import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus as PrismaAlertStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAlertDto, userId?: string) {
    return this.prisma.securityAlert.create({
      data: {
        userId,
        alertType: dto.type,
        title: dto.title,
        message: dto.message,
        targetId: dto.targetId,
        severity: dto.type === 'AI_SECURITY' ? 'HIGH' : 'MEDIUM',
      },
    });
  }

  findAll() {
    return this.prisma.securityAlert.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.securityAlert.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async updateStatus(id: string, dto: UpdateAlertStatusDto) {
    await this.findOne(id);
    return this.prisma.securityAlert.update({
      where: { id },
      data: { status: this.toPrismaStatus(dto.status) },
    });
  }

  private toPrismaStatus(status: string): PrismaAlertStatus {
    if (status === 'IN_PROGRESS') return PrismaAlertStatus.INVESTIGATING;
    if (status === 'TREATED' || status === 'DISMISSED') return PrismaAlertStatus.RESOLVED;
    return PrismaAlertStatus.OPEN;
  }
}
