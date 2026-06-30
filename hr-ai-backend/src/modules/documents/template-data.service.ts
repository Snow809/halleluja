import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  sanitizeFormData,
  TemplateFieldDefinition,
  TemplateFieldSchema,
} from './template-fields';

type EmployeeWithContext = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  employeeNumber: string;
  salary: Prisma.Decimal | number | string;
  hireDate: Date;
  department?: { name: string } | null;
  position?: { title: string } | null;
  manager?: { firstName: string; lastName: string } | null;
};

@Injectable()
export class TemplateDataService {
  resolve(
    schema: TemplateFieldSchema,
    employee: EmployeeWithContext,
    formDataInput?: unknown,
  ): { data: Record<string, string>; missingFields: TemplateFieldDefinition[] } {
    const formData = sanitizeFormData(formDataInput);
    const data: Record<string, string> = {};
    const missingFields: TemplateFieldDefinition[] = [];

    for (const field of schema) {
      const value = formData[field.key] || this.resolveField(field.key, employee);
      data[field.key] = value;
      if (field.required && !value.trim()) {
        missingFields.push(field);
      }
    }

    return { data, missingFields };
  }

  assertComplete(
    schema: TemplateFieldSchema,
    employee: EmployeeWithContext,
    formDataInput?: unknown,
  ): Record<string, string> {
    const { data, missingFields } = this.resolve(schema, employee, formDataInput);
    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Missing required template fields',
        missingFields: missingFields.map((field) => ({
          key: field.key,
          label: field.label,
          source: field.source,
          inputType: field.inputType,
        })),
      });
    }
    return data;
  }

  missingHints(
    schema: TemplateFieldSchema,
    employee?: EmployeeWithContext | null,
  ): Array<Pick<TemplateFieldDefinition, 'key' | 'label' | 'source' | 'inputType'>> {
    if (!employee) {
      return schema
        .filter((field) => field.required)
        .map(({ key, label, source, inputType }) => ({ key, label, source, inputType }));
    }
    return this.resolve(schema, employee).missingFields.map(({ key, label, source, inputType }) => ({
      key,
      label,
      source,
      inputType,
    }));
  }

  private resolveField(key: string, employee: EmployeeWithContext): string {
    switch (key) {
      case 'employeeFullName':
        return `${employee.firstName} ${employee.lastName}`;
      case 'employeeEmail':
        return employee.email;
      case 'employeePhone':
        return employee.phone ?? '';
      case 'employeeAddress':
        return employee.address ?? '';
      case 'employeeNumber':
        return employee.employeeNumber;
      case 'positionTitle':
        return employee.position?.title ?? '';
      case 'department':
        return employee.department?.name ?? '';
      case 'managerName':
        return employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'Direction';
      case 'hireDate':
      case 'entryDate':
        return employee.hireDate.toLocaleDateString('fr-FR');
      case 'salaryAmount': {
        const salary = Number(employee.salary);
        return Number.isFinite(salary) ? `${salary.toLocaleString('fr-FR')} MAD` : '';
      }
      case 'salaryAmountWords': {
        const salary = Math.round(Number(employee.salary));
        return Number.isFinite(salary) ? `${this.numberToFrenchWords(salary)} dirhams` : '';
      }
      case 'issueDate':
        return new Date().toLocaleDateString('fr-FR');
      case 'stampAndSignature':
        return '';
      default:
        return '';
    }
  }

  private numberToFrenchWords(value: number): string {
    if (value === 0) return 'zéro';
    if (value < 0) return `moins ${this.numberToFrenchWords(Math.abs(value))}`;
    const units = [
      '',
      'un',
      'deux',
      'trois',
      'quatre',
      'cinq',
      'six',
      'sept',
      'huit',
      'neuf',
      'dix',
      'onze',
      'douze',
      'treize',
      'quatorze',
      'quinze',
      'seize',
    ];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    const underHundred = (n: number): string => {
      if (n < 17) return units[n];
      if (n < 20) return `dix-${units[n - 10]}`;
      if (n < 70) {
        const ten = Math.floor(n / 10);
        const rest = n % 10;
        return `${tens[ten]}${rest === 1 ? ' et un' : rest ? `-${units[rest]}` : ''}`;
      }
      if (n < 80) return `soixante-${underHundred(n - 60)}`;
      if (n < 100) return `quatre-vingt${n === 80 ? 's' : `-${underHundred(n - 80)}`}`;
      return '';
    };
    const underThousand = (n: number): string => {
      if (n < 100) return underHundred(n);
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      const prefix = hundred === 1 ? 'cent' : `${units[hundred]} cent`;
      return `${prefix}${rest ? ` ${underHundred(rest)}` : hundred > 1 ? 's' : ''}`;
    };
    if (value < 1000) return underThousand(value);
    if (value < 1_000_000) {
      const thousands = Math.floor(value / 1000);
      const rest = value % 1000;
      const prefix = thousands === 1 ? 'mille' : `${underThousand(thousands)} mille`;
      return `${prefix}${rest ? ` ${underThousand(rest)}` : ''}`;
    }
    const millions = Math.floor(value / 1_000_000);
    const rest = value % 1_000_000;
    return `${underThousand(millions)} million${millions > 1 ? 's' : ''}${rest ? ` ${this.numberToFrenchWords(rest)}` : ''}`;
  }
}
