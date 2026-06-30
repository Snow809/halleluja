import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import {
  ChatResponse,
  DocumentTemplate,
  Employee,
  GeneratedDocument,
  HrDocument,
  HrRequest,
  Notification,
  OnboardingPlan,
} from "./types";

export const keys = {
  vacations: ["vacations"] as const,
  myDocuments: ["my-documents"] as const,
  templates: ["templates"] as const,
  notifications: ["notifications"] as const,
  onboarding: ["onboarding", "me"] as const,
  employees: ["employees"] as const,
  requests: ["requests"] as const,
  users: ["users"] as const,
  riskAlerts: ["risk-alerts"] as const,
  hrContacts: ["hr-contact-requests"] as const,
};

export function useDashboardQuery<T>(name: string) {
  return useQuery({ queryKey: ["dashboard", name], queryFn: () => api.get<T>(`/dashboard/${name}`) });
}

export function useVacations() {
  return useQuery({ queryKey: keys.vacations, queryFn: () => api.get<HrRequest[]>("/employees/me/vacations") });
}

export function useMyDocuments() {
  return useQuery({
    queryKey: keys.myDocuments,
    queryFn: () => api.get<{ hrDocs: HrDocument[]; generated: GeneratedDocument[] }>("/employees/me/documents"),
  });
}

export function useDocumentRequests() {
  return useQuery({
    queryKey: ["document-requests"],
    queryFn: () => api.get<{ requests: HrRequest[]; generated: GeneratedDocument[] }>("/employees/me/documents/requests"),
  });
}

export function useTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: () => api.get<DocumentTemplate[]>("/documents/templates") });
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: [...keys.notifications, userId],
    queryFn: () => api.get<Notification[]>("/notifications"),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
}

export function useOnboarding() {
  return useQuery({ queryKey: keys.onboarding, queryFn: () => api.get<OnboardingPlan>("/onboarding/me"), retry: false });
}

export function useEmployees() {
  return useQuery({ queryKey: keys.employees, queryFn: () => api.get<Employee[]>("/employees") });
}

export function useEmployee(id?: string) {
  return useQuery({ queryKey: ["employees", id], queryFn: () => api.get<Employee>(`/employees/${id}`), enabled: Boolean(id) });
}

export function useRequests(status?: string, kind?: string) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (kind) query.set("kind", kind);
  return useQuery({ queryKey: [...keys.requests, status, kind], queryFn: () => api.get<HrRequest[]>(`/employees/requests?${query}`) });
}

export function useMutationWithInvalidation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  invalidate: readonly (readonly unknown[] | string[])[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })));
    },
  });
}

export function useChatMutation() {
  return useMutation({ mutationFn: (input: { question: string; conversationId?: string }) => api.post<ChatResponse>("/chat/ask", input) });
}

