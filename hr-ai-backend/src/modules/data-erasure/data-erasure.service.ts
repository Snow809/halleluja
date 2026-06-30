import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { CreateDataErasureRequestDto } from './dto/create-data-erasure-request.dto';
import { UpdateDataErasureRequestDto } from './dto/update-data-erasure-request.dto';

@Injectable()
export class DataErasureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async candidates(search?: string) {
    const query = search?.trim();
    const searchWhere: Prisma.EmployeeWhereInput | undefined = query
      ? {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { employeeNumber: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined;
    return this.prisma.employee.findMany({
      where: query
        ? searchWhere
        : {
            status: { in: ['INACTIVE', 'OFFBOARDING'] },
          },
      take: 50,
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        user: { select: { id: true, email: true, accountStatus: true, lastLoginAt: true } },
        _count: { select: { requests: true, generatedDocs: true, hrDocuments: true } },
      },
    });
  }

  async listRequests() {
    return this.prisma.dataErasureRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { department: true, position: true } },
        requester: { select: { id: true, fullName: true, email: true } },
        reviewer: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async create(dto: CreateDataErasureRequestDto, user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.dataErasureRequest.findFirst({
      where: { employeeId: dto.employeeId, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException('A pending erasure request already exists for this employee.');
    }

    const request = await this.prisma.dataErasureRequest.create({
      data: {
        employeeId: dto.employeeId,
        requesterId: user.userId,
        reason: dto.reason,
        notes: dto.notes,
      },
    });
    await this.audit.logSensitiveAction(user.userId, 'DataErasureRequest', request.id, {
      action: 'queue_create',
      employeeId: dto.employeeId,
      destructive: false,
    });
    return request;
  }

  async updateStatus(id: string, dto: UpdateDataErasureRequestDto, user: AuthenticatedUser) {
    const existing = await this.prisma.dataErasureRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Erasure request not found');
    const request = await this.prisma.dataErasureRequest.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ?? existing.notes,
        reviewerId: dto.status === 'PENDING' ? null : user.userId,
        reviewedAt: dto.status === 'PENDING' ? null : new Date(),
      },
    });
    await this.audit.logSensitiveAction(user.userId, 'DataErasureRequest', id, {
      action: 'queue_status_update',
      status: dto.status,
      destructive: false,
    });
    return request;
  }
}
