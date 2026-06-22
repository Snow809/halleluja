import { Injectable, NotFoundException } from '@nestjs/common';
import { HrContactStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateHrContactDto } from './dto/create-hr-contact.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HrContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateHrContactDto) {
    const request = await this.prisma.hrContactRequest.create({ data: { userId, ...dto } });
    await this.notifications.createForRoles(['HR', 'ADMIN'], {
      type: 'REQUEST',
      title: 'Nouvelle demande de contact RH',
      message: `${dto.name} : ${dto.message.slice(0, 120)}`,
      resourceType: 'HrContactRequest',
      resourceId: request.id,
    });
    return request;
  }

  list() {
    return this.prisma.hrContactRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }

  async updateStatus(id: string, status: HrContactStatus) {
    const exists = await this.prisma.hrContactRequest.count({ where: { id } });
    if (!exists) throw new NotFoundException('HR contact request not found');
    const request = await this.prisma.hrContactRequest.update({ where: { id }, data: { status } });
    await this.notifications.create({
      userId: request.userId,
      type: 'REQUEST',
      title: 'Demande de contact RH mise à jour',
      message: `Votre demande est maintenant ${status}.`,
      resourceType: 'HrContactRequest',
      resourceId: request.id,
    });
    return request;
  }
}
