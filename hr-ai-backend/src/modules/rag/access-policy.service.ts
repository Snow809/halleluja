import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getActor(user: AuthenticatedUser) {
    return this.prisma.employee.findUnique({ where: { userId: user.userId } });
  }

  isGlobalHr(role: string) {
    return role === 'ADMIN' || role === 'HR';
  }

  canUseOrganizationAggregates(role: string) {
    return ['ADMIN', 'HR', 'MANAGER', 'DIRECTION', 'QVT'].includes(role);
  }

  async canAccessEmployee(
    user: AuthenticatedUser,
    targetEmployeeId: string,
    topic: 'salary' | 'profile' | 'wellbeing' | 'documents' | 'requests',
  ) {
    if (this.isGlobalHr(user.role)) return true;
    const actor = await this.getActor(user);
    if (!actor) return false;
    if (actor.id === targetEmployeeId) return true;
    if (user.role !== 'MANAGER') return false;
    if (topic === 'salary') return false;
    return this.prisma.employee
      .count({ where: { id: targetEmployeeId, managerId: actor.id } })
      .then((count) => count > 0);
  }
}
