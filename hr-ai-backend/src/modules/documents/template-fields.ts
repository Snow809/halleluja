import * as PizZip from 'pizzip';

export type TemplateFieldSource = 'EMPLOYEE' | 'REQUEST' | 'SYSTEM';
export type TemplateFieldInputType = 'text' | 'date' | 'number' | 'year';

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  source: TemplateFieldSource;
  required: boolean;
  sensitive?: boolean;
  storagePolicy?: 'STORE_SAFE' | 'TRANSIENT_ONLY';
  inputType?: TemplateFieldInputType;
  aliases?: string[];
}

export type TemplateFieldSchema = TemplateFieldDefinition[];

const KNOWN_FIELDS: Record<string, Omit<TemplateFieldDefinition, 'label'>> = {
  "[Nom et Prénom de l'employé(e)]": {
    key: 'employeeFullName',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
    aliases: ['nom', 'prenom', 'employee name', 'full name'],
  },
  '[Numéro CIN]': {
    key: 'cinNumber',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    aliases: ['cin', 'cni', 'identity number'],
  },
  '[Numéro CNSS personnel]': {
    key: 'cnssNumber',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    aliases: ['cnss', 'numéro cnss', 'social security number'],
  },
  "[Nom de la compagnie d'assurance, ex: Wafa Assurance, RMA, Sanlam]": {
    key: 'insuranceCompany',
    source: 'REQUEST',
    required: true,
    sensitive: false,
    aliases: ['assurance', 'mutuelle', 'compagnie', 'insurer', 'insurance company'],
  },
  '[Numéro de police]': {
    key: 'insurancePolicyNumber',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    aliases: ['police', 'policy number', 'numéro police'],
  },
  "[Date d'embauche]": {
    key: 'hireDate',
    source: 'EMPLOYEE',
    required: true,
    inputType: 'date',
    aliases: ['date embauche', 'hire date'],
  },
  '[Intitulé du poste]': {
    key: 'positionTitle',
    source: 'EMPLOYEE',
    required: true,
    aliases: ['poste', 'position', 'job title'],
  },
  '[Montant en chiffres]': {
    key: 'salaryAmount',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
    inputType: 'number',
    aliases: ['salaire', 'salary', 'montant'],
  },
  '[Montant en toutes lettres]': {
    key: 'salaryAmountWords',
    source: 'EMPLOYEE',
    required: true,
    sensitive: true,
    aliases: ['salaire en lettres', 'amount words'],
  },
  '[Année de référence, ex: 2025]': {
    key: 'referenceYear',
    source: 'REQUEST',
    required: true,
    inputType: 'year',
    aliases: ['année', 'annee', 'year', 'exercice'],
  },
  '[Rémunération brute globale]': {
    key: 'grossAnnualSalary',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
    aliases: ['brut', 'rémunération brute', 'gross salary'],
  },
  '[Salaire net imposable]': {
    key: 'taxableSalary',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
    aliases: ['net imposable', 'taxable salary'],
  },
  '[Montant IR prélevé]': {
    key: 'taxWithheld',
    source: 'REQUEST',
    required: true,
    sensitive: true,
    storagePolicy: 'TRANSIENT_ONLY',
    inputType: 'number',
    aliases: ['ir', 'impôt', 'tax withheld'],
  },
  "[Date d'entrée]": {
    key: 'entryDate',
    source: 'EMPLOYEE',
    required: true,
    inputType: 'date',
    aliases: ['date entrée', 'start date'],
  },
  '[Date de sortie]': {
    key: 'exitDate',
    source: 'REQUEST',
    required: true,
    inputType: 'date',
    aliases: ['date sortie', 'exit date', 'end date'],
  },
  '[Motif de la rupture, ex : Licenciement pour motif économique / Restructuration]': {
    key: 'exitReason',
    source: 'REQUEST',
    required: true,
    aliases: ['motif', 'rupture', 'reason'],
  },
  '[Date de délivrance]': {
    key: 'issueDate',
    source: 'SYSTEM',
    required: true,
    inputType: 'date',
    aliases: ['date délivrance', 'issue date'],
  },
  '[Cachet et Signature]': {
    key: 'stampAndSignature',
    source: 'SYSTEM',
    required: false,
    aliases: ['cachet', 'signature'],
  },
};

export function extractBracketLabels(templateBuffer: Buffer): string[] {
  const zip = new PizZip(templateBuffer);
  const labels = new Set<string>();
  for (const path of Object.keys(zip.files)) {
    if (!path.startsWith('word/') || !path.endsWith('.xml')) continue;
    const file = zip.file(path);
    if (!file) continue;
    const xml = file.asText();
    for (const match of xml.matchAll(/\[[^\]]+\]/g)) {
      labels.add(match[0]);
    }
  }
  return [...labels];
}

export function buildFieldSchemaFromLabels(labels: string[]): TemplateFieldSchema {
  const counts = new Map<string, number>();
  return labels.map((label) => {
    const known = KNOWN_FIELDS[label];
    if (known) return { ...known, label };
    const baseKey = slugKey(label);
    const count = counts.get(baseKey) ?? 0;
    counts.set(baseKey, count + 1);
    return {
      key: count ? `${baseKey}${count + 1}` : baseKey,
      label,
      source: 'REQUEST',
      required: true,
      aliases: [label.replace(/[[\]]/g, '')],
    };
  });
}

export function buildFieldSchema(templateBuffer: Buffer): TemplateFieldSchema {
  return buildFieldSchemaFromLabels(extractBracketLabels(templateBuffer));
}

export function normalizeTemplateFieldSchema(value: unknown): TemplateFieldSchema {
  if (!Array.isArray(value)) return [];
  return value
    .filter((field): field is TemplateFieldDefinition => {
      if (!field || typeof field !== 'object') return false;
      const candidate = field as Record<string, unknown>;
      return (
        typeof candidate.key === 'string' &&
        typeof candidate.label === 'string' &&
        ['EMPLOYEE', 'REQUEST', 'SYSTEM'].includes(String(candidate.source))
      );
    })
    .map((field) => ({
      key: field.key,
      label: field.label,
      source: field.source,
      required: Boolean(field.required),
      sensitive: Boolean(field.sensitive),
      storagePolicy: field.storagePolicy === 'TRANSIENT_ONLY' ? 'TRANSIENT_ONLY' : 'STORE_SAFE',
      inputType: field.inputType,
      aliases: Array.isArray(field.aliases) ? field.aliases.filter((item) => typeof item === 'string') : [],
    }));
}

export function replaceBracketLabelsWithDocxtemplaterTags(
  templateBuffer: Buffer,
  schema: TemplateFieldSchema,
): Buffer {
  const zip = new PizZip(templateBuffer);
  for (const path of Object.keys(zip.files)) {
    if (!path.startsWith('word/') || !path.endsWith('.xml')) continue;
    const file = zip.file(path);
    if (!file) continue;
    let xml = file.asText();
    for (const field of schema) {
      xml = xml.split(field.label).join(`{${field.key}}`);
    }
    zip.file(path, xml);
  }
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function sanitizeFormData(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, String(item).trim()])
      .filter(([, item]) => item.length > 0),
  );
}


export function redactFormDataForStorage(
  schema: TemplateFieldSchema,
  value: unknown,
): Record<string, string | boolean> {
  const formData = sanitizeFormData(value);
  const fields = new Map(schema.map((field) => [field.key, field]));
  const safe: Record<string, string | boolean> = {};
  for (const [key, item] of Object.entries(formData)) {
    const field = fields.get(key);
    if (field?.storagePolicy === 'TRANSIENT_ONLY' || field?.sensitive) {
      safe[key] = true;
    } else {
      safe[key] = item;
    }
  }
  return safe;
}

function slugKey(label: string) {
  return (
    label
      .replace(/[[\]]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
      .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '') || 'field'
  );
}
