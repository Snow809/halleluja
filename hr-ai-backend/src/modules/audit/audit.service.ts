import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

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
