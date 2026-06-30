import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface AuditLogFilters {
  actor?: string;
  action?: string;
  resourceType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  resourceId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  logRoleChange(userId: string | undefined, resourceId: string, metadata?: Record<string, unknown>) {
    return this.createLog(userId, 'ROLE_CHANGE', 'User', resourceId, 'SUCCESS', metadata);
  }

  logDocumentValidation(
    userId: string | undefined,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createLog(userId, 'DOCUMENT_VALIDATION', 'HrDocument', resourceId, 'SUCCESS', metadata);
  }

  logAIRefusal(userId: string | undefined, metadata?: Record<string, unknown>) {
    return this.createLog(userId, 'AI_REFUSAL', 'AI', undefined, 'DENIED', metadata);
  }

  logSecurityBlock(userId: string | undefined, metadata?: Record<string, unknown>) {
    return this.createLog(userId, 'SECURITY_BLOCK', 'Security', undefined, 'DENIED', metadata);
  }

  logSensitiveAction(
    userId: string | undefined,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createLog(userId, 'SENSITIVE_ACTION', resourceType, resourceId, 'SUCCESS', metadata);
  }

  log(
    userId: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    status: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createLog(userId, action, resourceType, resourceId, status, metadata);
  }

  findMany(user: AuthenticatedUser, filters: AuditLogFilters = {}) {
    const where: Prisma.AuditLogWhereInput = {};
    if (user.role !== 'ADMIN') {
      where.resourceType = { in: ['Employee', 'HrRequest', 'HrDocument', 'GeneratedDocument', 'DocumentTemplate', 'WorkflowTask', 'AI'] };
    }
    if (filters.actor) {
      where.user = {
        is: {
          OR: [
            { fullName: { contains: filters.actor, mode: 'insensitive' } },
            { email: { contains: filters.actor, mode: 'insensitive' } },
          ],
        },
      };
    }
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.status) where.status = filters.status;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      };
    }
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async exportCsv(user: AuthenticatedUser, filters: AuditLogFilters = {}) {
    const logs = await this.findMany(user, filters);
    const header = ['createdAt', 'actor', 'action', 'resourceType', 'resourceId', 'status'];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user ? `${log.user.fullName} <${log.user.email}>` : '',
      log.action,
      log.resourceType,
      log.resourceId ?? '',
      log.status,
    ]);
    return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private createLog(
    userId: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    status: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        status,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
