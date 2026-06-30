import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const MIN_GROUP_SIZE = 3;

type QvtEmployeeInput = {
  id: string;
  departmentId: string | null;
  managerId: string | null;
  companyType: string;
  wfhSetupAvailable: boolean;
  designationLevel: number;
  resourceAllocationScore: any;
  mentalFatigueScore: any;
  jobSatisfactionScore: any;
  workLifeBalanceScore: any;
  managerSupportScore: any;
  recognitionScore: any;
};

type ModelMetadata = {
  modelVersion: string;
  trainedAt: string;
};

@Injectable()
export class QvtService {
  private readonly artifactPath =
    process.env.QVT_MODEL_METADATA_PATH || join(process.cwd(), 'ml', 'artifacts', 'qvt-model-metadata.json');

  constructor(private readonly prisma: PrismaService) {}

  async companySummary() {
    const employees = await this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: this.employeeSelect(),
    });
    return this.aggregate('COMPANY', null, employees);
  }

  async departmentSummary(departmentId?: string) {
    const where: any = { status: { in: ['ACTIVE', 'ONBOARDING'] } };
    if (departmentId) where.departmentId = departmentId;
    const employees = await this.prisma.employee.findMany({ where, select: this.employeeSelect() });
    return this.aggregate('DEPARTMENT', departmentId ?? 'ALL', employees);
  }

  async departmentBreakdown() {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        employees: {
          where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
          select: this.employeeSelect(),
        },
      },
    });

    return departments.map((department) => ({
      departmentId: department.id,
      departmentName: department.name,
      ...this.aggregate('DEPARTMENT', department.id, department.employees),
    }));
  }

  async managerTeamSummary(user: AuthenticatedUser) {
    const manager = await this.prisma.employee.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!manager) throw new NotFoundException('Manager profile not found');
    const employees = await this.prisma.employee.findMany({
      where: { managerId: manager.id, status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: this.employeeSelect(),
    });
    return this.aggregate('TEAM', manager.id, employees);
  }

  async recomputeSnapshots() {
    const metadata = this.readMetadata();
    if (!metadata) {
      return {
        modelStatus: 'NOT_TRAINED',
        message: 'QVT model artifacts are missing. Train the local models before recomputing snapshots.',
        snapshotsCreated: 0,
      };
    }
    const company = await this.companySummary();
    if (!company.available) return { modelStatus: company.modelStatus, snapshotsCreated: 0 };
    await this.prisma.qvtPredictionSnapshot.create({
      data: {
        scopeType: 'COMPANY',
        scopeId: null,
        employeeCount: company.employeeCount,
        averageBurnoutRisk: company.averageBurnoutRisk,
        averageDisengagementRisk: company.averageDisengagementRisk,
        riskDistribution: company.riskDistribution,
        topDrivers: company.topDrivers,
        recommendation: company.recommendation,
        modelVersion: metadata.modelVersion,
        trainedAt: new Date(metadata.trainedAt),
      },
    });
    return { modelStatus: 'READY', snapshotsCreated: 1 };
  }

  private aggregate(scopeType: 'COMPANY' | 'DEPARTMENT' | 'TEAM', scopeId: string | null, employees: QvtEmployeeInput[]) {
    const metadata = this.readMetadata();
    if (!metadata) {
      return this.unavailable(scopeType, scopeId, employees.length, 'NOT_TRAINED');
    }
    if (employees.length < MIN_GROUP_SIZE) {
      return this.unavailable(scopeType, scopeId, employees.length, 'INSUFFICIENT_GROUP_SIZE');
    }

    const predictions = employees.map((employee) => this.scoreEmployee(employee));
    const averageBurnoutRisk = this.average(predictions.map((item) => item.burnout));
    const averageDisengagementRisk = this.average(predictions.map((item) => item.disengagement));
    const topDrivers = this.aggregateDrivers(employees);

    return {
      available: true,
      modelStatus: 'READY',
      scopeType,
      scopeId,
      employeeCount: employees.length,
      averageBurnoutRisk,
      averageDisengagementRisk,
      riskDistribution: {
        burnout: this.bucketize(predictions.map((item) => item.burnout)),
        disengagement: this.bucketize(predictions.map((item) => item.disengagement)),
      },
      topDrivers,
      recommendation: this.recommendation(averageBurnoutRisk, averageDisengagementRisk, topDrivers),
      modelVersion: metadata.modelVersion,
      trainedAt: metadata.trainedAt,
    };
  }

  private unavailable(scopeType: string, scopeId: string | null, employeeCount: number, modelStatus: string) {
    return {
      available: false,
      modelStatus,
      scopeType,
      scopeId,
      employeeCount,
      averageBurnoutRisk: null,
      averageDisengagementRisk: null,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      topDrivers: [],
      recommendation:
        modelStatus === 'INSUFFICIENT_GROUP_SIZE'
          ? 'Groupe trop petit pour afficher des statistiques QVT anonymes.'
          : 'Modèle QVT non entraîné. Ajoutez les datasets Kaggle localement puis lancez le script de formation.',
      modelVersion: null,
      trainedAt: null,
    };
  }

  private scoreEmployee(employee: QvtEmployeeInput) {
    const mentalFatigue = Number(employee.mentalFatigueScore);
    const allocation = Number(employee.resourceAllocationScore);
    const satisfaction = Number(employee.jobSatisfactionScore);
    const balance = Number(employee.workLifeBalanceScore);
    const support = Number(employee.managerSupportScore);
    const recognition = Number(employee.recognitionScore);
    const burnout = this.clamp((mentalFatigue * 9 + allocation * 6 + (10 - balance) * 5) / 2);
    const disengagement = this.clamp(((10 - satisfaction) * 8 + (10 - support) * 6 + (10 - recognition) * 6) / 2);
    return { burnout, disengagement };
  }

  private aggregateDrivers(employees: QvtEmployeeInput[]) {
    const avg = (key: keyof QvtEmployeeInput) => this.average(employees.map((employee) => Number(employee[key])));
    const drivers = [
      { key: 'mentalFatigueScore', label: 'Fatigue mentale moyenne', value: avg('mentalFatigueScore') },
      { key: 'resourceAllocationScore', label: 'Charge / allocation moyenne', value: avg('resourceAllocationScore') },
      { key: 'workLifeBalanceScore', label: 'Équilibre vie pro/perso moyen', value: avg('workLifeBalanceScore') },
      { key: 'managerSupportScore', label: 'Soutien manager moyen', value: avg('managerSupportScore') },
      { key: 'recognitionScore', label: 'Reconnaissance moyenne', value: avg('recognitionScore') },
    ];
    return drivers.sort((a, b) => this.driverSeverity(b) - this.driverSeverity(a)).slice(0, 3);
  }

  private driverSeverity(driver: { key: string; value: number }) {
    if (driver.key === 'mentalFatigueScore' || driver.key === 'resourceAllocationScore') return driver.value;
    return 10 - driver.value;
  }

  private recommendation(burnout: number, disengagement: number, drivers: Array<{ label: string; value: number }>) {
    const focus = drivers[0]?.label.toLowerCase() ?? 'les signaux collectifs';
    if (burnout >= 65 || disengagement >= 65) {
      return `Priorité collective élevée : travailler sur ${focus}, réduire les irritants d'équipe et relancer un point QVT anonyme sous 30 jours.`;
    }
    if (burnout >= 40 || disengagement >= 40) {
      return `Surveillance recommandée : suivre ${focus}, clarifier les priorités et renforcer les rituels de feedback.`;
    }
    return 'Situation collective stable. Maintenir les rituels QVT et surveiller les tendances mensuelles.';
  }

  private bucketize(values: number[]) {
    return values.reduce(
      (acc, value) => {
        if (value >= 65) acc.high += 1;
        else if (value >= 40) acc.medium += 1;
        else acc.low += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    );
  }

  private average(values: number[]) {
    if (!values.length) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
  }

  private readMetadata(): ModelMetadata | null {
    if (!existsSync(this.artifactPath)) return null;
    try {
      const parsed = JSON.parse(readFileSync(this.artifactPath, 'utf8'));
      if (typeof parsed.modelVersion === 'string' && typeof parsed.trainedAt === 'string') return parsed;
    } catch {
      return null;
    }
    return null;
  }

  private employeeSelect() {
    return {
      id: true,
      departmentId: true,
      managerId: true,
      companyType: true,
      wfhSetupAvailable: true,
      designationLevel: true,
      resourceAllocationScore: true,
      mentalFatigueScore: true,
      jobSatisfactionScore: true,
      workLifeBalanceScore: true,
      managerSupportScore: true,
      recognitionScore: true,
    } as const;
  }
}
