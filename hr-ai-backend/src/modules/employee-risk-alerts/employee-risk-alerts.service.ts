import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class EmployeeRiskAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const where = await this.scope(user);
    return this.prisma.employeeRiskAlert.findMany({
      where,
      orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          include: { position: true, department: true },
        },
      },
    });
  }

  async followUp(id: string, note: string, user: AuthenticatedUser) {
    await this.assertAccess(id, user);
    return this.prisma.employeeRiskAlert.update({
      where: { id },
      data: { followUpNote: note, followUpAt: new Date() },
    });
  }

  async resolve(id: string, user: AuthenticatedUser) {
    await this.assertAccess(id, user);
    return this.prisma.employeeRiskAlert.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }

  private async scope(user: AuthenticatedUser) {
    if (user.role === 'ADMIN') return {};
    if (user.role !== 'MANAGER') throw new ForbiddenException('Risk alerts are restricted');
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    if (!actor) return { id: 'none' };
    return { employee: { managerId: actor.id } };
  }

  private async assertAccess(id: string, user: AuthenticatedUser) {
    const alert = await this.prisma.employeeRiskAlert.findFirst({
      where: { id, ...(await this.scope(user)) },
    });
    if (!alert) throw new NotFoundException('Risk alert not found');
  }
}
