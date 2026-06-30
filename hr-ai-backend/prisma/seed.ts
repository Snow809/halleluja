import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { Prisma, PrismaClient } from '@prisma/client';
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
  companyType?: string;
  wfhSetupAvailable?: string;
  designationLevel?: string;
  resourceAllocationScore?: string;
  mentalFatigueScore?: string;
  jobSatisfactionScore?: string;
  workLifeBalanceScore?: string;
  managerSupportScore?: string;
  recognitionScore?: string;
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

type SeedTemplateField = {
  key: string;
  label: string;
  source: 'EMPLOYEE' | 'REQUEST' | 'SYSTEM';
  required: boolean;
  sensitive?: boolean;
  storagePolicy?: 'STORE_SAFE' | 'TRANSIENT_ONLY';
  inputType?: 'text' | 'date' | 'number' | 'year';
  aliases?: string[];
};

const seedFieldMap: Record<string, Omit<SeedTemplateField, 'label'>> = {
  "[Nom et Prénom de l'employé(e)]": {
    key: 'employeeFullName',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
  },
  '[Numéro CIN]': { key: 'cinNumber', source: 'REQUEST', required: true, sensitive: true, storagePolicy: 'TRANSIENT_ONLY' },
  '[Numéro CNSS personnel]': {
    key: 'cnssNumber',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
  },
  "[Nom de la compagnie d'assurance, ex: Wafa Assurance, RMA, Sanlam]": {
    key: 'insuranceCompany',
    source: 'REQUEST',
    required: true,
  },
  '[Numéro de police]': {
    key: 'insurancePolicyNumber',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
  },
  "[Date d'embauche]": { key: 'hireDate', source: 'EMPLOYEE', required: true, inputType: 'date' },
  '[Intitulé du poste]': { key: 'positionTitle', source: 'EMPLOYEE', required: true },
  '[Montant en chiffres]': {
    key: 'salaryAmount',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
    inputType: 'number',
  },
  '[Montant en toutes lettres]': {
    key: 'salaryAmountWords',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
  },
  '[Année de référence, ex: 2025]': {
    key: 'referenceYear',
    source: 'REQUEST',
    required: true,
    inputType: 'year',
  },
  '[Rémunération brute globale]': {
    key: 'grossAnnualSalary',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
  },
  '[Salaire net imposable]': {
    key: 'taxableSalary',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
  },
  '[Montant IR prélevé]': {
    key: 'taxWithheld',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
  },
  "[Date d'entrée]": { key: 'entryDate', source: 'EMPLOYEE', required: true, inputType: 'date' },
  '[Date de sortie]': { key: 'exitDate', source: 'REQUEST', required: true, inputType: 'date' },
  '[Motif de la rupture, ex : Licenciement pour motif économique / Restructuration]': {
    key: 'exitReason',
    source: 'REQUEST',
    required: true,
  },
  '[Date de délivrance]': { key: 'issueDate', source: 'SYSTEM', required: true, inputType: 'date' },
  '[Cachet et Signature]': { key: 'stampAndSignature', source: 'SYSTEM', required: false },
};

function buildFieldSchema(templateBuffer: Buffer): SeedTemplateField[] {
  const zip = new PizZip(templateBuffer);
  const labels = new Set<string>();
  for (const path of Object.keys(zip.files)) {
    if (!path.startsWith('word/') || !path.endsWith('.xml')) continue;
    const file = zip.file(path);
    if (!file) continue;
    for (const match of file.asText().matchAll(/\[[^\]]+\]/g)) {
      labels.add(match[0]);
    }
  }
  return [...labels].map((label) => {
    const known = seedFieldMap[label];
    if (known) return { ...known, label };
    return { key: label.replace(/[[\]]/g, ''), label, source: 'REQUEST', required: true };
  });
}

function parseCsv(path: string): EmployeeCsvRow[] {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as EmployeeCsvRow;
  });
}

const atlasTemplateSeeds = [
  {
    title: 'Atlas Tech - Attestation CNSS',
    documentType: 'Attestation CNSS',
    category: 'Attestations',
    description: 'Attestation CNSS officielle générée depuis les données collaborateur.',
    fixture: 'Atlas_Tech_Attestation_CNSS_Vierge.docx',
    filePath: 'templates/atlas-tech/attestation-cnss.docx',
  },
  {
    title: 'Atlas Tech - Attestation AMO / Mutuelle',
    documentType: 'Attestation AMO / Mutuelle',
    category: 'Attestations',
    description: 'Attestation mutuelle avec compagnie d’assurance et numéro de police.',
    fixture: 'Atlas_Tech_Attestation_Mutuelle_AMO_Vierge.docx',
    filePath: 'templates/atlas-tech/attestation-mutuelle-amo.docx',
  },
  {
    title: 'Atlas Tech - Attestation de salaire',
    documentType: 'Attestation de salaire',
    category: 'Paie',
    description: 'Attestation de salaire générée depuis les données RH autorisées.',
    fixture: 'Atlas_Tech_Attestation_Salaire_Vierge.docx',
    filePath: 'templates/atlas-tech/attestation-salaire.docx',
  },
  {
    title: 'Atlas Tech - Attestation IR',
    documentType: 'Attestation IR',
    category: 'Paie',
    description: 'Attestation IR avec année de référence et montants fiscaux.',
    fixture: 'Atlas_Tech_Attestation_IR_Vierge.docx',
    filePath: 'templates/atlas-tech/attestation-ir.docx',
  },
  {
    title: 'Atlas Tech - Attestation cessation IPE',
    documentType: 'Attestation cessation IPE',
    category: 'Attestations',
    description: 'Attestation de cessation pour dossier IPE.',
    fixture: 'Atlas_Tech_Attestation_Cessation_IPE_Vierge.docx',
    filePath: 'templates/atlas-tech/attestation-cessation-ipe.docx',
  },
];

async function seedAtlasTemplates(uploadedBy: string) {
  await prisma.documentTemplate.deleteMany({
    where: {
      OR: [
        { filePath: { startsWith: 'templates/atlas-tech/' } },
        { filePath: { startsWith: 'templates/modele-' } },
        { title: { in: atlasTemplateSeeds.map((template) => template.title) } },
      ],
    },
  });
  for (const template of atlasTemplateSeeds) {
    const body = readFileSync(join(__dirname, 'fixtures', 'templates', template.fixture));
    await uploadSeedObject(
      template.filePath,
      body,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await prisma.documentTemplate.create({
      data: {
        uploadedBy,
        title: template.title,
        documentType: template.documentType,
        category: template.category,
        description: template.description,
        filePath: template.filePath,
        sizeBytes: body.length,
        fileType: 'DOCX',
        isActive: true,
        fieldSchema: buildFieldSchema(body) as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

async function seedHrDemoDocuments(uploadedBy: string, collabId: string) {
  const documentSeeds = [
    {
      title: 'Contrat CDI Nadia Amrani',
      documentType: 'Contrat',
      category: 'Contrats',
      filePath: 'hr-documents/contrat-nadia-amrani.txt',
      content: 'Contrat CDI de Nadia Amrani. Document privé employé.',
      employeeId: collabId,
      isPublic: false,
      visibility: 'EMPLOYEE_PRIVATE' as const,
    },
    {
      title: 'Bulletin de paie Mai 2026',
      documentType: 'Bulletin de paie',
      category: 'Paie',
      filePath: 'hr-documents/bulletin-mai-2026.txt',
      content: 'Bulletin de paie de mai 2026. Document privé employé.',
      employeeId: collabId,
      isPublic: false,
      visibility: 'EMPLOYEE_PRIVATE' as const,
    },
    {
      title: 'Règlement intérieur Maroc 2026',
      documentType: 'Politique',
      category: 'Politiques',
      filePath: 'hr-documents/reglement-interieur-maroc-2026.txt',
      content: 'Règlement intérieur 2026. Respect, sécurité, confidentialité et égalité professionnelle.',
      isPublic: true,
      visibility: 'PUBLIC' as const,
    },
    {
      title: 'Guide congés et absences',
      documentType: 'Procédure',
      category: 'Procédures',
      filePath: 'hr-documents/guide-conges-absences.txt',
      content: 'Les demandes de congés doivent être soumises dans le portail. Un justificatif est requis pour un congé maladie.',
      isPublic: true,
      visibility: 'PUBLIC' as const,
    },
  ];

  await prisma.hrDocument.deleteMany({
    where: { filePath: { in: documentSeeds.map((document) => document.filePath) } },
  });

  for (const document of documentSeeds) {
    const body = Buffer.from(document.content, 'utf8');
    await uploadSeedObject(document.filePath, body, 'text/plain; charset=utf-8');
    const storedDocument = await prisma.hrDocument.create({
      data: {
        uploadedBy,
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
}

async function repairManagerLinksFromCsv() {
  const rows = parseCsv(join(process.cwd(), 'prisma', 'fixtures', 'employees.csv'));
  for (const row of rows) {
    if (!row.managerEmail) continue;
    const [employee, manager] = await Promise.all([
      prisma.employee.findUnique({ where: { email: row.email }, select: { id: true } }),
      prisma.employee.findUnique({ where: { email: row.managerEmail }, select: { id: true } }),
    ]);
    if (employee && manager) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { managerId: manager.id },
      });
    }
  }

  const departments = await prisma.department.findMany();
  for (const department of departments) {
    const managerRow = rows.find(
      (row) => row.department === department.name && ['MANAGER', 'HR', 'ADMIN'].includes(row.role),
    );
    const fallbackManagerRow = rows.find((row) => row.email === 'admin@ydays.local');
    const managerEmail = managerRow?.email ?? fallbackManagerRow?.email;
    if (!managerEmail) continue;
    const manager = await prisma.employee.findUnique({ where: { email: managerEmail }, select: { id: true } });
    if (manager) {
      await prisma.department.update({
        where: { id: department.id },
        data: { managerId: manager.id },
      });
    }
  }
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    const hrUser = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['HR', 'ADMIN'] },
            },
          },
        },
      },
    });
    if (hrUser) {
      await repairManagerLinksFromCsv();
      await seedAtlasTemplates(hrUser.id);
      const collab = await prisma.employee.findUnique({ where: { email: 'collab@ydays.local' } });
      if (collab) await seedHrDemoDocuments(hrUser.id, collab.id);
      await prisma.generatedDocument.deleteMany({
        where: { fileType: 'TXT', filePath: { startsWith: 'generated/attestation-nadia-amrani' } },
      });
      console.log('Database already seeded. Refreshed Atlas Tech templates and HR demo documents.');
      return;
    }
    console.log('Database already seeded. Skipping seed to prevent data loss.');
    return;
  }

  const rows = parseCsv(join(process.cwd(), 'prisma', 'fixtures', 'employees.csv'));

  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
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
        companyType: row.companyType || 'SERVICE',
        wfhSetupAvailable: String(row.wfhSetupAvailable || '').toLowerCase() === 'true',
        designationLevel: Number(row.designationLevel || 2),
        resourceAllocationScore: Number(row.resourceAllocationScore || 5),
        mentalFatigueScore: Number(row.mentalFatigueScore || 5),
        jobSatisfactionScore: Number(row.jobSatisfactionScore || 6),
        workLifeBalanceScore: Number(row.workLifeBalanceScore || 6),
        managerSupportScore: Number(row.managerSupportScore || 6),
        recognitionScore: Number(row.recognitionScore || 6),
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
  await seedAtlasTemplates(hrUser.id);
  // Fake vacations and document requests have been removed for a clean slate.

  await seedHrDemoDocuments(hrUser.id, collab.id);

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
