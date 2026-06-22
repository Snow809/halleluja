import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private mapUser(user: any) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.roles?.[0]?.role?.name || 'COLLABORATOR',
      isActive: user.accountStatus === 'ACTIVE',
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
      employee: user.employee, // Included for edit modal
    };
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role ?? 'COLLABORATOR' },
    });
    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName || dto.email.split('@')[0],
        roles: role ? {
          create: {
            roleId: role.id,
          },
        } : undefined,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        employee: true,
      },
    });

    return this.mapUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        employee: true,
      },
    });
    return users.map(user => this.mapUser(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    return this.mapUser(user);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, actor?: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) {
      throw new Error(`Role ${dto.role} not found`);
    }

    await this.prisma.userRole.deleteMany({
      where: { userId: id },
    });

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        roles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    await this.auditService.logRoleChange(actor?.userId, id, { role: dto.role });
    return this.mapUser(user);
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'SUSPENDED' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    return this.mapUser(user);
  }

  async activate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'ACTIVE' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    return this.mapUser(user);
  }

  async remove(id: string) {
    try {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.employee.deleteMany({ where: { userId: id } });
      await this.prisma.user.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      await this.deactivate(id);
      return { success: false, message: 'Utilisateur désactivé (données liées existantes).' };
    }
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true, settings: true },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateSettings(userId: string, settings: Record<string, unknown>, locale?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: settings as any,
        ...(locale ? { locale } : {}),
      },
      select: { locale: true, settings: true },
    });
  }
}
