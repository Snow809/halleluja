import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as PizZip from 'pizzip';

type EmployeeCsvRow = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  position: string;
  level: string;
  managerEmail: string;
  phone: string;
  location: string;
  address: string;
  skills: string;
  salary: string;
  hireDate: string;
  status: string;
  engagementScore: string;
  presenceScore: string;
  performanceScore: string;
  vacationBalanceDays: string;
  accountStatus: string;
  onboardingState: string;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://ydays:ydays@localhost:5432/ydays_hr?schema=public',
  }),
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'hr-documents';
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint:
    process.env.MINIO_INTERNAL_ENDPOINT ||
    `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'password123',
  },
  forcePathStyle: true,
});

async function uploadSeedObject(key: string, body: Buffer, contentType: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } else {
      throw error;
    }
  }
  await s3.send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body, ContentType: contentType }),
  );
}

function createTemplate(title: string) {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.folder('_rels')?.file(
    '.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.folder('word')?.file(
    'document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      `<w:p><w:r><w:t>${title}</w:t></w:r></w:p>` +
      '<w:p><w:r><w:t>Employé : {employee_name}</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Poste : {employee_position}</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Département : {department}</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Manager : {manager_name}</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Date : {date}</w:t></w:r></w:p>' +
      '<w:sectPr/></w:body></w:document>',
  );
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function parseCsv(path: string): EmployeeCsvRow[] {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as EmployeeCsvRow;
  });
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping seed to prevent data loss.');
    return;
  }

  const rows = parseCsv(join(process.cwd(), 'prisma', 'fixtures', 'employees.csv'));

  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.employeeRiskAlert.deleteMany();
  await prisma.securityAlert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.kpiSnapshot.deleteMany();
  await prisma.dataImport.deleteMany();
  await prisma.workflowTask.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.hrDocument.deleteMany();
  await prisma.generatedDocument.deleteMany();
  await prisma.hrRequest.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  const permissionSeeds = [
    ['users.manage', 'Manage users and roles'],
    ['hr.read', 'Read HR records'],
    ['hr.write', 'Create and update HR records'],
    ['documents.manage', 'Manage HR documents'],
    ['analytics.read', 'Read dashboards and KPI analytics'],
    ['security.manage', 'Review audit logs and security alerts'],
    ['workflow.manage', 'Manage onboarding and offboarding tasks'],
    ['imports.manage', 'Import HR datasets from CSV'],
    ['ai.chat', 'Use ARIA assistant'],
    ['ai.supervise', 'Review ARIA supervision logs'],
  ];
  const permissions = await Promise.all(
    permissionSeeds.map(([code, description]) => prisma.permission.create({ data: { code, description } })),
  );
  const roleSeeds = [
    ['ADMIN', 'Platform administrator'],
    ['HR', 'Human resources team'],
    ['MANAGER', 'Operational manager'],
    ['DIRECTION', 'Executive decision maker'],
    ['QVT', 'Quality of work life analyst'],
    ['COLLABORATOR', 'Employee self-service user'],
  ];
  const roles = await Promise.all(roleSeeds.map(([name, description]) => prisma.role.create({ data: { name, description } })));
  const permissionByCode = new Map<string, any>(permissions.map((permission: any) => [permission.code, permission]));
  const roleByName = new Map<string, any>(roles.map((role: any) => [role.name, role]));
  const grants: Record<string, string[]> = {
    ADMIN: permissions.map((permission: any) => permission.code),
    HR: ['hr.read', 'hr.write', 'documents.manage', 'analytics.read', 'workflow.manage', 'imports.manage', 'ai.chat', 'ai.supervise'],
    MANAGER: ['hr.read', 'analytics.read', 'workflow.manage', 'ai.chat'],
    DIRECTION: ['analytics.read', 'hr.read'],
    QVT: ['analytics.read', 'hr.read', 'ai.chat'],
    COLLABORATOR: ['hr.read', 'ai.chat'],
  };
  for (const [roleName, codes] of Object.entries(grants)) {
    for (const code of codes) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleByName.get(roleName)!.id,
          permissionId: permissionByCode.get(code)!.id,
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  const userByEmail = new Map<string, { id: string; email: string; fullName: string }>();
  for (const row of rows) {
    const user = await prisma.user.create({
      data: {
        email: row.email,
        fullName: `${row.firstName} ${row.lastName}`,
        passwordHash,
        accountStatus: row.accountStatus as 'ACTIVE' | 'SUSPENDED',
        onboardingState: row.onboardingState as 'OFF' | 'ON' | 'OFFBOARDING',
        lastLoginAt: row.accountStatus === 'ACTIVE' ? new Date(2026, 5, Math.max(1, Number(row.employeeNumber.slice(-2)) % 28), 9, 30) : undefined,
        roles: { create: { roleId: roleByName.get(row.role)!.id } },
      },
    });
    userByEmail.set(user.email, user);
  }

  const departmentByName = new Map<string, { id: string; name: string }>();
  for (const name of Array.from(new Set(rows.map((row) => row.department)))) {
    departmentByName.set(name, await prisma.department.create({ data: { name } }));
  }
  const positionByTitle = new Map<string, { id: string; title: string }>();
  for (const row of rows) {
    if (!positionByTitle.has(row.position)) {
      positionByTitle.set(row.position, await prisma.jobPosition.create({
        data: { title: row.position, level: row.level, description: `${row.level} role in ${row.department}` },
      }));
    }
  }

  const employeeByEmail = new Map<string, { id: string; email: string; firstName: string; lastName: string }>();
  for (const row of rows) {
    const employee = await prisma.employee.create({
      data: {
        userId: userByEmail.get(row.email)!.id,
        departmentId: departmentByName.get(row.department)!.id,
        positionId: positionByTitle.get(row.position)!.id,
        employeeNumber: row.employeeNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        location: row.location,
        address: row.address,
        skills: row.skills.split(';').filter(Boolean),
        salary: Number(row.salary),
        hireDate: new Date(row.hireDate),
        status: row.status as 'ACTIVE' | 'ONBOARDING' | 'OFFBOARDING' | 'INACTIVE',
        engagementScore: Number(row.engagementScore),
        presenceScore: Number(row.presenceScore),
        performanceScore: Number(row.performanceScore),
        vacationBalanceDays: Number(row.vacationBalanceDays),
      },
    });
    employeeByEmail.set(employee.email, employee);
  }
  for (const row of rows) {
    const manager = row.managerEmail ? employeeByEmail.get(row.managerEmail) : undefined;
    if (manager) {
      await prisma.employee.update({ where: { email: row.email }, data: { managerId: manager.id } });
    }
  }
  for (const department of Array.from(departmentByName.values())) {
    const departmentManagerRow = rows.find((row) => row.department === department.name && ['MANAGER', 'HR', 'ADMIN'].includes(row.role));
    const manager = departmentManagerRow ? employeeByEmail.get(departmentManagerRow.email) : employeeByEmail.get('admin@ydays.local');
    if (manager) await prisma.department.update({ where: { id: department.id }, data: { managerId: manager.id } });
  }

  const hrUser = userByEmail.get('hr@ydays.local')!;
  const collab = employeeByEmail.get('collab@ydays.local')!;
  const templateSeeds = [
    { title: 'Modèle attestation de travail', documentType: 'Attestation de travail', category: 'Attestations', description: 'Justificatif professionnel pour banques, visas et administrations.', filePath: 'templates/modele-attestation-travail.docx', fileType: 'DOCX' },
    { title: 'Modèle bulletin de paie', documentType: 'Bulletin de paie', category: 'Paie', description: 'Copie de bulletin de paie mensuel.', filePath: 'templates/modele-bulletin-paie.docx', fileType: 'DOCX' },
    { title: 'Modèle attestation CNSS', documentType: 'Attestation CNSS', category: 'Attestations', description: 'Attestation administrative liée aux déclarations sociales.', filePath: 'templates/modele-attestation-cnss.docx', fileType: 'DOCX' },
    { title: 'Modèle attestation de congés', documentType: 'Attestation de congés', category: 'Attestations', description: 'Confirmation officielle de droits ou périodes de congés.', filePath: 'templates/modele-attestation-conges.docx', fileType: 'DOCX' },
  ];
  for (const template of templateSeeds) {
    const body = createTemplate(template.title);
    await uploadSeedObject(
      template.filePath,
      body,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await prisma.documentTemplate.create({
      data: { ...template, sizeBytes: body.length, uploadedBy: hrUser.id },
    });
  }
  // Fake vacations and document requests have been removed for a clean slate.

  const documentSeeds = [
    { title: 'Contrat CDI Nadia Amrani', documentType: 'Contrat', category: 'Contrats', filePath: 'hr-documents/contrat-nadia-amrani.txt', content: 'Contrat CDI de Nadia Amrani. Document privé employé.', employeeId: collab.id, isPublic: false, visibility: 'EMPLOYEE_PRIVATE' as const },
    { title: 'Bulletin de paie Mai 2026', documentType: 'Bulletin de paie', category: 'Paie', filePath: 'hr-documents/bulletin-mai-2026.txt', content: 'Bulletin de paie de mai 2026. Document privé employé.', employeeId: collab.id, isPublic: false, visibility: 'EMPLOYEE_PRIVATE' as const },
    { title: 'Règlement intérieur Maroc 2026', documentType: 'Politique', category: 'Politiques', filePath: 'hr-documents/reglement-interieur-maroc-2026.txt', content: 'Règlement intérieur 2026. Respect, sécurité, confidentialité et égalité professionnelle.', isPublic: true, visibility: 'PUBLIC' as const },
    { title: 'Guide congés et absences', documentType: 'Procédure', category: 'Procédures', filePath: 'hr-documents/guide-conges-absences.txt', content: 'Les demandes de congés doivent être soumises dans le portail. Un justificatif est requis pour un congé maladie.', isPublic: true, visibility: 'PUBLIC' as const },
  ];
  for (const document of documentSeeds) {
    const body = Buffer.from(document.content, 'utf8');
    await uploadSeedObject(document.filePath, body, 'text/plain; charset=utf-8');
    const storedDocument = await prisma.hrDocument.create({
      data: {
        uploadedBy: hrUser.id,
        employeeId: document.employeeId,
        title: document.title,
        documentType: document.documentType,
        category: document.category,
        filePath: document.filePath,
        sizeBytes: body.length,
        fileType: 'TXT',
        isPublic: document.isPublic,
        visibility: document.visibility,
        allowedRoles: [],
        status: 'APPROVED',
      },
    });
    await prisma.documentChunk.create({
      data: {
        documentId: storedDocument.id,
        chunkText: document.content,
        chunkOrder: 0,
      },
    });
  }

  const generatedSeed = Buffer.from('Attestation de travail de Nadia Amrani.', 'utf8');
  await uploadSeedObject('generated/attestation-nadia-amrani.txt', generatedSeed, 'text/plain');
  await prisma.generatedDocument.create({
    data: {
      employeeId: collab.id,
      generatedBy: hrUser.id,
      documentType: 'Attestation de travail',
      filePath: 'generated/attestation-nadia-amrani.txt',
      sizeBytes: generatedSeed.length,
      fileType: 'TXT',
      downloads: 0,
      isPublic: false,
      status: 'APPROVED',
    },
  });

  const onboardingRows = rows.filter((row) => row.onboardingState === 'ON');
  for (const row of onboardingRows) {
    const employee = employeeByEmail.get(row.email)!;
    const assignee = employeeByEmail.get(row.managerEmail || 'hr@ydays.local') ?? employeeByEmail.get('hr@ydays.local')!;
    for (const [index, title] of ['Signature contrat', 'Creation acces IT', 'Presentation equipe', 'Formation outils internes'].entries()) {
      await prisma.workflowTask.create({
        data: {
          employeeId: employee.id,
          assignedTo: assignee.id,
          workflowType: 'ONBOARDING',
          phase: index < 2 ? 'Semaine 1 - Integration' : 'Semaine 2 - Formation',
          stepOrder: index + 1,
          title,
          description: title,
          dueDate: new Date(2026, 5, 12 + index),
          completedAt: index < 2 ? new Date(2026, 5, 9 + index) : undefined,
          locked: index > 2,
          status: index < 2 ? 'DONE' : 'TODO',
        },
      });
    }
  }

  for (const row of rows.filter((item) => Number(item.engagementScore) < 70).slice(0, 4)) {
    const employee = employeeByEmail.get(row.email)!;
    await prisma.employeeRiskAlert.create({
      data: {
        employeeId: employee.id,
        level: Number(row.engagementScore) < 68 ? 'HIGH' : 'MEDIUM',
        title: Number(row.engagementScore) < 68 ? 'Risque engagement eleve' : 'Engagement a surveiller',
        detail: `Score engagement ${row.engagementScore}% avec presence ${row.presenceScore}%.`,
        recommendation: 'Planifier un point manager RH et clarifier la charge de travail.',
        factors: [`Engagement ${row.engagementScore}%`, `Presence ${row.presenceScore}%`, `Performance ${row.performanceScore}%`],
        aiScore: Math.max(55, 100 - Number(row.engagementScore)),
      },
    });
  }

  await prisma.securityAlert.createMany({
    data: [
      { userId: userByEmail.get('collab@ydays.local')!.id, alertType: 'Unauthorized payroll request', severity: 'HIGH', status: 'OPEN' },
      { userId: userByEmail.get('manager@ydays.local')!.id, alertType: 'Repeated confidential query', severity: 'MEDIUM', status: 'INVESTIGATING' },
    ],
  });

  await prisma.dataImport.create({
    data: {
      importedBy: userByEmail.get('admin@ydays.local')!.id,
      importType: 'employees_csv_seed',
      fileName: 'employees.csv',
      status: 'COMPLETED',
      totalRows: rows.length,
      errorRows: 0,
    },
  });

  for (const department of Array.from(departmentByName.values())) {
    const scoped = rows.filter((row) => row.department === department.name);
    const engagement = scoped.reduce((sum, row) => sum + Number(row.engagementScore), 0) / Math.max(scoped.length, 1);
    await prisma.kpiSnapshot.create({
      data: {
        departmentId: department.id,
        kpiName: 'Engagement',
        kpiValue: Math.round(engagement),
        periodStart: new Date(2026, 5, 1),
        periodEnd: new Date(2026, 5, 30),
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: userByEmail.get('admin@ydays.local')!.id, action: 'seed.csv_import', resourceType: 'employee', status: 'SUCCESS' },
      { userId: hrUser.id, action: 'request.review', resourceType: 'hr_request', status: 'SUCCESS' },
      { userId: userByEmail.get('manager@ydays.local')!.id, action: 'assistant.blocked', resourceType: 'ai_message', status: 'DENIED' },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
