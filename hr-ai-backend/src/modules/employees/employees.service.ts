import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';
import { GenerationService } from '../documents/generation.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { S3Service } from '../../services/storage/s3.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generationService: GenerationService,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const nameParts = dto.fullName ? dto.fullName.trim().split(/\s+/) : ['Utilisateur'];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Utilisateur';

    let finalManagerId = dto.managerId;
    if (!finalManagerId && dto.department) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.department },
      });
      if (dept && dept.managerId) {
        finalManagerId = dept.managerId;
      }
    }

    return this.prisma.employee.create({
      data: {
        userId: dto.userId || undefined,
        employeeNumber: dto.matricule,
        email: dto.email,
        firstName,
        lastName,
        location: dto.site,
        hireDate: dto.hiredAt ? new Date(dto.hiredAt) : new Date(),
        salary: dto.salary ? Number(dto.salary) : 0,
        managerId: finalManagerId || undefined,
        departmentId: dto.department || undefined,
        positionId: dto.position || undefined,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    const where = await this.employeeScope(user);
    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      }
    });
    return employees.map((employee) => this.sanitizeEmployee(employee, user));
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, ...(await this.employeeScope(user)) },
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        absences: { orderBy: { startDate: 'desc' }, take: 20 },
        requests: { orderBy: { createdAt: 'desc' }, take: 20, include: { template: true } },
        hrDocuments: { orderBy: { createdAt: 'desc' }, take: 20 },
        generatedDocs: { orderBy: { generatedAt: 'desc' }, take: 20 },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.sanitizeEmployee(employee, user);
  }

  update(id: string, dto: UpdateEmployeeDto) {
    const data: any = {};
    if (dto.matricule) data.employeeNumber = dto.matricule;
    if (dto.email) data.email = dto.email;
    if (dto.fullName) {
      const nameParts = dto.fullName.trim().split(/\s+/);
      data.firstName = nameParts[0];
      data.lastName = nameParts.slice(1).join(' ') || 'Utilisateur';
    }
    if (dto.site) data.location = dto.site;
    if (dto.hiredAt) data.hireDate = new Date(dto.hiredAt);
    if (dto.managerId) data.managerId = dto.managerId;
    if (dto.department) data.departmentId = dto.department;
    if (dto.position) data.positionId = dto.position;
    if (dto.salary !== undefined) data.salary = Number(dto.salary);

    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  importEmployees(dto: ImportEmployeesDto) {
    return {
      status: 'placeholder',
      format: dto.format ?? 'csv-or-xlsx',
      message: 'Employee import skeleton. CSV/XLSX parsing and validation will be implemented later.',
    };
  }

  async getMyVacationRequests(email: string) {
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) return [];
    return this.prisma.hrRequest.findMany({
      where: { employeeId: employee.id, kind: 'VACATION' },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createVacationRequest(email: string, dto: any, attachment?: Express.Multer.File) {
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (attachment && !['application/pdf', 'image/jpeg', 'image/png'].includes(attachment.mimetype)) {
      throw new BadRequestException('Attachment must be PDF, JPG or PNG');
    }
    let attachmentPath: string | undefined;
    if (attachment) {
      const extension = attachment.originalname.split('.').pop() ?? 'bin';
      attachmentPath = `leave-attachments/${employee.id}-${Date.now()}.${extension}`;
      await this.s3.uploadFile(attachmentPath, attachment.buffer, attachment.mimetype);
    }
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const durationDays = Number(dto.durationDays || 1);
    const request = await this.prisma.hrRequest.create({
      data: {
        employeeId: employee.id,
        kind: 'VACATION',
        requestType: dto.type,
        detail: dto.reason || `${dto.startDate} - ${dto.endDate}`,
        startDate,
        endDate,
        durationDays,
        status: 'PENDING',
        priority: 'NORMAL',
        attachmentPath,
        attachmentName: attachment?.originalname,
        attachmentType: attachment?.mimetype,
        attachmentSize: attachment?.size,
      }
    });
    await this.notifyRequestReviewers(employee, request.id, request.requestType);
    return request;
  }

  async getScopedRequests(user: AuthenticatedUser, status?: string, kind?: string) {
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const where: any = {};
    if (user.role === 'MANAGER') {
      if (!actor) return [];
      where.employee = { managerId: actor.id };
    } else if (user.role !== 'ADMIN' && user.role !== 'HR') {
      throw new ForbiddenException('Request review is restricted');
    }
    if (status) where.status = status.toUpperCase();
    if (kind) where.kind = kind.toUpperCase();
    return this.prisma.hrRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { department: true, position: true } },
        template: true,
      },
    });
  }

  async createDocumentRequest(userId: string, dto: { templateId: string; note?: string }) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const template = await this.prisma.documentTemplate.findUnique({ where: { id: dto.templateId } });
    if (!template || !template.isActive) {
      throw new NotFoundException('Template introuvable ou inactif');
    }

    const request = await this.prisma.hrRequest.create({
      data: {
        employeeId: employee.id,
        templateId: template.id,
        kind: 'DOCUMENT',
        requestType: template.title,
        detail: `Demande de document: ${template.title}`,
        status: 'PENDING',
        priority: 'NORMAL',
        note: dto.note,
      }
    });
    await this.notifyRequestReviewers(employee, request.id, request.requestType);
    return request;
  }

  async getMyDocumentRequests(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) return [];
    
    // Get HR requests of kind DOCUMENT
    const requests = await this.prisma.hrRequest.findMany({
      where: { employeeId: employee.id, kind: 'DOCUMENT' },
      orderBy: { createdAt: 'desc' },
      include: { template: true }
    });

    // Also get the generated documents directly
    const generated = await this.prisma.generatedDocument.findMany({
      where: { employeeId: employee.id },
      orderBy: { generatedAt: 'desc' }
    });

    return { requests, generated };
  }

  async getMyDocuments(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) return [];

    const hrDocs = await this.prisma.hrDocument.findMany({
      where: { 
        OR: [
          { employeeId: employee.id },
          { isPublic: true }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const generated = await this.prisma.generatedDocument.findMany({
      where: { employeeId: employee.id, status: 'APPROVED' },
      orderBy: { generatedAt: 'desc' }
    });

    return { hrDocs, generated };
  }

  async updateRequestStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    reviewer: AuthenticatedUser,
    comment?: string,
  ) {
    if (status === 'REJECTED' && !comment) {
      throw new BadRequestException('Un motif est obligatoire pour refuser une demande.');
    }

    const existing = await this.prisma.hrRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!existing) throw new NotFoundException('Request not found');
    if (existing.status === status) throw new BadRequestException(`Request is already ${status.toLowerCase()}`);
    if (reviewer.role === 'MANAGER') {
      const manager = await this.prisma.employee.findUnique({ where: { userId: reviewer.userId } });
      if (!manager || existing.employee.managerId !== manager.id) {
        throw new ForbiddenException('You can only review requests from direct reports');
      }
    } else if (reviewer.role !== 'ADMIN' && reviewer.role !== 'HR') {
      throw new ForbiddenException('Request review is restricted');
    }
    if (existing.status === 'APPROVED') {
      if (existing.kind !== 'VACATION') {
        throw new BadRequestException('Only approved leave requests can be reopened');
      }
      await this.reverseApprovedVacation(existing);
    } else if (existing.status === 'REJECTED' && status !== 'PENDING') {
      throw new BadRequestException('A rejected request must be reopened before approval');
    }

    const req = await this.prisma.hrRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: status === 'PENDING' ? null : reviewer.userId,
        reviewedAt: status === 'PENDING' ? null : new Date(),
        comment: comment || (status === 'PENDING' ? 'Demande rouverte pour révision' : null),
      }
    });

    const requestEmployee = await this.prisma.employee.findUnique({
      where: { id: req.employeeId },
      select: { userId: true },
    });
    if (requestEmployee?.userId) {
      await this.notifications.create({
        userId: requestEmployee.userId,
        type: 'REQUEST',
        title:
          status === 'APPROVED'
            ? 'Demande approuvée'
            : status === 'REJECTED'
              ? 'Demande refusée'
              : 'Demande rouverte',
        message: `${req.requestType} : ${
          status === 'APPROVED' ? 'approuvée' : status === 'REJECTED' ? 'refusée' : 'remise en attente'
        }.`,
        resourceType: 'HrRequest',
        resourceId: req.id,
      });
    }

    if (status === 'APPROVED' && req.kind === 'VACATION') {
      await this.prisma.absence.create({
        data: {
          employeeId: req.employeeId,
          requestId: req.id,
          absenceType: req.requestType,
          startDate: req.startDate || new Date(),
          endDate: req.endDate || new Date(),
          durationDays: req.durationDays || 1,
          status: 'APPROVED',
        }
      });
      
      const normalizedRequestType = req.requestType
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (
        ['conges payes', 'conge paye', 'vacation'].includes(normalizedRequestType) &&
        req.durationDays
      ) {
         await this.prisma.employee.update({
           where: { id: req.employeeId },
           data: {
             vacationBalanceDays: { decrement: Math.ceil(Number(req.durationDays)) }
           }
         });
      } else if (normalizedRequestType === 'rtt' && req.durationDays) {
         await this.prisma.employee.update({
           where: { id: req.employeeId },
           data: {
             rttBalanceDays: { decrement: Math.ceil(Number(req.durationDays)) }
           }
         });
      }
    } else if (status === 'APPROVED' && req.kind === 'DOCUMENT') {
      // Trigger generation async without awaiting to not block response
      this.generationService.generateDocument(req.id).catch(e => {
        console.error(`Failed to generate document for request ${req.id}`, e);
      });
    }

    return req;
  }

  private async reverseApprovedVacation(request: {
    id: string;
    employeeId: string;
    requestType: string;
    startDate: Date | null;
    endDate: Date | null;
    durationDays: any;
  }) {
    const linked = await this.prisma.absence.deleteMany({ where: { requestId: request.id } });
    if (!linked.count && request.startDate && request.endDate) {
      await this.prisma.absence.deleteMany({
        where: {
          employeeId: request.employeeId,
          absenceType: request.requestType,
          startDate: request.startDate,
          endDate: request.endDate,
          status: 'APPROVED',
        },
      });
    }
    if (!request.durationDays) return;
    const days = Math.ceil(Number(request.durationDays));
    const normalizedType = request.requestType
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (['conges payes', 'conge paye', 'vacation'].includes(normalizedType)) {
      await this.prisma.employee.update({
        where: { id: request.employeeId },
        data: { vacationBalanceDays: { increment: days } },
      });
    } else if (normalizedType === 'rtt') {
      await this.prisma.employee.update({
        where: { id: request.employeeId },
        data: { rttBalanceDays: { increment: days } },
      });
    }
  }

  async createAbsence(dto: any) {
    if (!dto.employeeId || !dto.absenceType || !dto.startDate || !dto.endDate) {
      throw new Error('Missing required fields for absence');
    }
    
    return this.prisma.absence.create({
      data: {
        employeeId: dto.employeeId,
        absenceType: dto.absenceType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        durationDays: dto.durationDays || 1,
        status: 'APPROVED',
      }
    });
  }

  getDepartments() {
    return this.prisma.department.findMany({ select: { id: true, name: true } });
  }

  getPositions() {
    return this.prisma.jobPosition.findMany({ select: { id: true, title: true } });
  }

  async getRequestAttachment(id: string, user: AuthenticatedUser) {
    const request = await this.prisma.hrRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!request?.attachmentPath) throw new NotFoundException('Attachment not found');
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    const allowed =
      user.role === 'ADMIN' ||
      user.role === 'HR' ||
      actor?.id === request.employeeId ||
      (user.role === 'MANAGER' && request.employee.managerId === actor?.id);
    if (!allowed) throw new ForbiddenException('Attachment access denied');
    return {
      url: await this.s3.getPresignedUrl(request.attachmentPath, 300),
      name: request.attachmentName,
      type: request.attachmentType,
    };
  }

  private async employeeScope(user: AuthenticatedUser) {
    if (user.role === 'ADMIN' || user.role === 'HR') return {};
    if (user.role !== 'MANAGER') throw new ForbiddenException('Employee directory access denied');
    const actor = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    return actor ? { managerId: actor.id } : { id: 'none' };
  }

  private sanitizeEmployee(employee: any, user: AuthenticatedUser) {
    if (user.role === 'ADMIN' || user.role === 'HR') return employee;
    const safe = { ...employee };
    delete safe.salary;
    delete safe.address;
    delete safe.hrDocuments;
    delete safe.generatedDocs;
    return safe;
  }

  private async notifyRequestReviewers(
    employee: { managerId: string | null; firstName: string; lastName: string },
    requestId: string,
    requestType: string,
  ) {
    await this.notifications.createForRoles(['HR', 'ADMIN'], {
      type: 'REQUEST',
      title: 'Nouvelle demande employé',
      message: `${employee.firstName} ${employee.lastName} : ${requestType}.`,
      resourceType: 'HrRequest',
      resourceId: requestId,
    });
    if (employee.managerId) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: employee.managerId },
        select: { userId: true },
      });
      if (manager?.userId) {
        await this.notifications.create({
          userId: manager.userId,
          type: 'REQUEST',
          title: 'Nouvelle demande de votre équipe',
          message: `${employee.firstName} ${employee.lastName} : ${requestType}.`,
          resourceType: 'HrRequest',
          resourceId: requestId,
        });
      }
    }
  }
}
