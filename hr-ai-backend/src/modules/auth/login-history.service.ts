import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LoginHistoryService {
  constructor(private prisma: PrismaService) {}

  async recordLogin(userId: string, _email: string, _ipAddress?: string, _userAgent?: string) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGIN_SUCCESS',
        resourceType: 'User',
        resourceId: userId,
        status: 'SUCCESS',
      },
    });
  }

  async recordFailedLogin(_email: string, _ipAddress?: string, _userAgent?: string) {
    return this.prisma.auditLog.create({
      data: {
        action: 'LOGIN_FAILURE',
        resourceType: 'User',
        status: 'FAILED',
      },
    });
  }

  async getUserLoginHistory(userId: string, limit: number = 50) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId, action: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      userId: log.userId,
      email: '',
      ipAddress: '',
      userAgent: '',
      status: log.status,
      loginAt: log.createdAt,
    }));
  }

  async getAllLoginHistory(limit: number = 100) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE'] }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      },
    });

    return logs.map(log => ({
      id: log.id,
      userId: log.userId,
      email: log.user?.email || '',
      ipAddress: '',
      userAgent: '',
      status: log.status,
      loginAt: log.createdAt,
      user: log.user ? {
        email: log.user.email,
        role: log.user.roles?.[0]?.role?.name || 'COLLABORATOR'
      } : null
    }));
  }
}
