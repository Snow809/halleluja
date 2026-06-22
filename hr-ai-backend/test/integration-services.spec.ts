import { ForbiddenException } from '@nestjs/common';
import { DocumentParserService } from '../src/services/document-parser/document-parser.service';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { S3Service } from '../src/services/storage/s3.service';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('frontend integration services', () => {
  it('parses object-storage text buffers for RAG indexing', async () => {
    const parser = new DocumentParserService();
    const parsed = await parser.parseBuffer(Buffer.from('Politique de congés'), 'TXT');
    expect(parsed.text).toBe('Politique de congés');
  });

  it('loads pdf-parse correctly in the CommonJS Nest build', async () => {
    const fixture = await readFile(join(process.cwd(), 'test', 'fixtures', 'minimal.pdf'));
    const parser = new DocumentParserService();
    const parsed = await parser.parseBuffer(fixture, 'PDF');
    expect(parsed.pageCount).toBe(1);
    expect(parsed.text).toContain('HR policy');
  });

  it('uploads through the shared MinIO client after ensuring the bucket', async () => {
    const storage = new S3Service() as any;
    storage.ensureBucket = jest.fn().mockResolvedValue(undefined);
    storage.internalClient.send = jest.fn().mockResolvedValue({});

    await storage.uploadFile('documents/example.txt', Buffer.from('content'), 'text/plain');

    expect(storage.ensureBucket).toHaveBeenCalledTimes(1);
    expect(storage.internalClient.send).toHaveBeenCalledTimes(1);
  });

  it('creates one persisted notification per active authorized role user', async () => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'hr' }, { id: 'admin' }]) },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const service = new NotificationsService(prisma as any);

    await service.createForRoles(['HR', 'ADMIN'], {
      type: 'REQUEST',
      title: 'Request',
      message: 'Review required',
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'hr', type: 'REQUEST' }),
        expect.objectContaining({ userId: 'admin', type: 'REQUEST' }),
      ],
    });
  });

  it('prevents managers from reviewing requests outside direct reports', async () => {
    const prisma = {
      hrRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request',
          status: 'PENDING',
          employee: { id: 'employee', managerId: 'different-manager' },
        }),
      },
      employee: {
        findUnique: jest.fn().mockResolvedValue({ id: 'manager' }),
      },
    };
    const service = new EmployeesService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.updateRequestStatus(
        'request',
        'APPROVED',
        { userId: 'manager-user', email: 'manager@example.com', role: 'MANAGER' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.hrRequest.findUnique).toHaveBeenCalledWith({
      where: { id: 'request' },
      include: { employee: true },
    });
  });

  it('reopens an approved vacation and restores its deducted balance', async () => {
    const request = {
      id: 'request',
      employeeId: 'employee',
      requestType: 'Congés payés',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      durationDays: 3,
      status: 'APPROVED',
      kind: 'VACATION',
      employee: { id: 'employee', managerId: 'manager' },
    };
    const prisma = {
      hrRequest: {
        findUnique: jest.fn().mockResolvedValue(request),
        update: jest.fn().mockResolvedValue({ ...request, status: 'PENDING' }),
      },
      employee: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'manager' })
          .mockResolvedValueOnce({ userId: 'employee-user' }),
        update: jest.fn().mockResolvedValue({}),
      },
      absence: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const service = new EmployeesService(prisma as any, {} as any, {} as any, notifications as any);

    await service.updateRequestStatus(
      'request',
      'PENDING',
      { userId: 'manager-user', email: 'manager@example.com', role: 'MANAGER' } as any,
      'Recheck dates',
    );

    expect(prisma.absence.deleteMany).toHaveBeenCalledWith({ where: { requestId: 'request' } });
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: 'employee' },
      data: { vacationBalanceDays: { increment: 3 } },
    });
    expect(prisma.hrRequest.update).toHaveBeenCalledWith({
      where: { id: 'request' },
      data: expect.objectContaining({ status: 'PENDING', reviewedBy: null, reviewedAt: null }),
    });
  });
});
