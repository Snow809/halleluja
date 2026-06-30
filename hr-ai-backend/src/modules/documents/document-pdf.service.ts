import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as Docxtemplater from 'docxtemplater';
import * as PizZip from 'pizzip';
import { AppConfigService } from '../../config/config.service';
import { PresidioService } from '../../services/anonymization/presidio.service';

type TemplateData = Record<string, string | number | null | undefined>;

@Injectable()
export class DocumentPdfService {
  private readonly logger = new Logger(DocumentPdfService.name);
  private readonly forcedSensitiveKeys = new Set([
    'employee_name',
    'employee_email',
    'employee_phone',
    'employee_address',
    'employee_number',
    'salary',
    'salaryAmount',
    'salaryAmountWords',
    'grossAnnualSalary',
    'taxableSalary',
    'taxWithheld',
    'employeeFullName',
    'cinNumber',
    'cnssNumber',
    'insurancePolicyNumber',
    'manager_name',
  ]);

  constructor(
    private readonly config: AppConfigService,
    private readonly presidio: PresidioService,
  ) {}

  renderDocx(templateBuffer: Buffer, data: TemplateData): Buffer {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });
    doc.render(data);
    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  async anonymizeData(data: TemplateData): Promise<TemplateData> {
    const next: TemplateData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        next[key] = value;
        continue;
      }

      const stringValue = String(value);
      const presidioValue = await this.presidio.redact(stringValue, 'fr');
      next[key] =
        this.forcedSensitiveKeys.has(key) && presidioValue === stringValue
          ? this.redactionBlockFor(stringValue)
          : presidioValue;
    }
    return next;
  }

  async convertDocxToPdf(docxBuffer: Buffer, fileName = 'document.docx'): Promise<Buffer> {
    const form = new FormData();
    form.append(
      'files',
      new Blob([new Uint8Array(docxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      fileName,
    );
    const response = await fetch(`${this.config.gotenbergUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Gotenberg conversion failed: ${response.status} ${detail}`);
      throw new BadRequestException('PDF generation failed');
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private redactionBlockFor(value: string) {
    const length = Math.min(Math.max(value.length, 8), 24);
    return '░'.repeat(length);
  }
}
