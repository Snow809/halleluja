import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async createForRoles(
    roles: string[],
    notification: Omit<Parameters<NotificationsService['create']>[0], 'userId'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { role: { name: { in: roles } } } }, accountStatus: 'ACTIVE' },
      select: { id: true },
    });
    if (!users.length) return { count: 0 };
    return this.prisma.notification.createMany({
      data: users.map(({ id }) => ({ userId: id, ...notification })),
    });
  }
}
