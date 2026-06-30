export type BackendRole = "COLLABORATOR" | "HR" | "MANAGER" | "ADMIN" | "QVT" | "DIRECTION";
export type AppShell = "employee" | "hr" | "manager" | "admin" | "qvt";

export interface Employee {
  id: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  skills?: string[];
  presenceScore: number;
  performanceScore: number;
  vacationBalanceDays: number;
  rttBalanceDays: number;
  hireDate: string;
  status: string;
  department?: { id: string; name: string };
  position?: { id: string; title: string; level?: string };
  manager?: { id: string; firstName: string; lastName: string };
  isOnLeave?: boolean;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: BackendRole;
  fullName: string;
  employee?: Employee;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  email: string;
  setupRequired: boolean;
  qrCodeUrl?: string;
  secret?: string;
  expiresInSeconds: number;
}

export interface ConsentStatus {
  termsAccepted: boolean;
  requiredVersion: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface HrRequest {
  id: string;
  kind: "VACATION" | "DOCUMENT";
  requestType: string;
  detail: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number | string;
  priority: "NORMAL" | "URGENT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string;
  formData?: Record<string, unknown>;
  comment?: string;
  createdAt: string;
  attachmentName?: string;
  employee?: Employee;
  template?: DocumentTemplate;
}

export interface HrDocument {
  id: string;
  title: string;
  category: string;
  fileType: string;
  status: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  documentType: string;
  fileType: string;
  status: string;
  generatedAt: string;
}

export interface DocumentPreview {
  url: string | null;
  fileName: string;
  fileType: string;
  previewable: boolean;
  anonymized?: boolean;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  documentType: string;
  category: string;
  description?: string;
  isActive: boolean;
  missingDataHints?: TemplateField[];
}

export interface TemplateField {
  key: string;
  label: string;
  source: "EMPLOYEE" | "REQUEST" | "SYSTEM";
  required: boolean;
  sensitive?: boolean;
  inputType?: "text" | "date" | "number" | "year";
}

export interface WorkflowTask {
  id: string;
  workflowType?: "ONBOARDING" | "OFFBOARDING";
  phase: string;
  stepOrder: number;
  title: string;
  description: string;
  dueDate: string;
  completedAt?: string;
  locked: boolean;
  status: string;
}

export interface OnboardingPlan {
  id: string;
  workflowType: "ONBOARDING" | "OFFBOARDING";
  employee: Employee;
  steps: WorkflowTask[];
  progress: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority?: "LOW" | "NORMAL" | "HIGH";
  readAt?: string;
  createdAt: string;
}

export interface QvtAggregateSummary {
  available: boolean;
  modelStatus: "READY" | "NOT_TRAINED" | "INSUFFICIENT_GROUP_SIZE" | string;
  scopeType: "COMPANY" | "DEPARTMENT" | "TEAM";
  employeeCount: number;
  averageBurnoutRisk: number | null;
  averageDisengagementRisk: number | null;
  topDrivers: Array<{ key: string; label: string; value: number }>;
  recommendation: string;
  modelVersion?: string | null;
  trainedAt?: string | null;
}

export interface ChatSource {
  documentId: string;
  title: string;
  sourcePage?: number;
  chunkOrder?: number;
}

export interface ProposedAction {
  id: string;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
  expiresAt: string;
}

export interface ChatResponse {
  conversationId: string;
  answer: string;
  refused: boolean;
  sources: ChatSource[];
  proposedAction?: ProposedAction;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationDetail extends ChatConversationSummary {
  messages: Array<{ id: string; role: "USER" | "ASSISTANT"; content: string; sources?: ChatSource[]; createdAt: string }>;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
