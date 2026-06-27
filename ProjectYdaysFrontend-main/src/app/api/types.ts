export type BackendRole = "COLLABORATOR" | "HR" | "MANAGER" | "ADMIN" | "QVT" | "DIRECTION";
export type AppShell = "employee" | "hr" | "manager" | "admin";

export interface Employee {
  id: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  skills: string[];
  presenceScore: number;
  performanceScore: number;
  engagementScore: number;
  vacationBalanceDays: number;
  rttBalanceDays: number;
  salary?: number | string;
  hireDate: string;
  status: string;
  department?: { id: string; name: string };
  position?: { id: string; title: string; level?: string };
  manager?: { id: string; firstName: string; lastName: string };
  requests?: HrRequest[];
  absences?: Absence[];
  hrDocuments?: HrDocument[];
  generatedDocs?: GeneratedDocument[];
  isOnLeave?: boolean;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: BackendRole;
  fullName: string;
  employee?: Employee;
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
  comment?: string;
  reviewedAt?: string;
  createdAt: string;
  attachmentName?: string;
  employee?: Employee;
  template?: DocumentTemplate;
}

export interface Absence {
  id: string;
  absenceType: string;
  startDate: string;
  endDate: string;
  durationDays: number | string;
  status: string;
}

export interface HrDocument {
  id: string;
  title: string;
  documentType: string;
  category: string;
  sizeBytes: number;
  fileType: string;
  downloads: number;
  visibility: string;
  status: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  documentType: string;
  sizeBytes: number;
  fileType: string;
  downloads: number;
  status: string;
  generatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  documentType: string;
  category: string;
  description?: string;
  isActive: boolean;
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
  completionNote?: string;
  locked: boolean;
  status: string;
  assignedTo?: string;
  assignee?: { id: string; firstName: string; lastName: string; email?: string };
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
  resourceType?: string;
  resourceId?: string;
  readAt?: string;
  createdAt: string;
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

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
