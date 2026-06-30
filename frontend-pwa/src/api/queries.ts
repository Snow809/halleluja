import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { DocumentTemplate, Employee, GeneratedDocument, HrDocument, HrRequest, Notification, OnboardingPlan } from "./types";

export const keys = {
  vacations: ["vacations"] as const,
  documents: ["documents"] as const,
  documentRequests: ["document-requests"] as const,
  templates: ["templates"] as const,
  notifications: ["notifications"] as const,
  onboarding: ["onboarding"] as const,
  employees: ["employees"] as const,
  requests: ["requests"] as const,
  qvt: ["qvt"] as const,
};

export const useDashboardQuery = <T,>(name: string) =>
  useQuery({ queryKey: ["dashboard", name], queryFn: () => api.get<T>(`/dashboard/${name}`) });

export const useVacations = () => useQuery({ queryKey: keys.vacations, queryFn: () => api.get<HrRequest[]>("/employees/me/vacations") });

export const useMyDocuments = () =>
  useQuery({
    queryKey: keys.documents,
    queryFn: () => api.get<{ hrDocs: HrDocument[]; generated: GeneratedDocument[] }>("/employees/me/documents"),
  });

export const useDocumentRequests = () =>
  useQuery({
    queryKey: keys.documentRequests,
    queryFn: () => api.get<{ requests: HrRequest[]; generated: GeneratedDocument[] }>("/employees/me/documents/requests"),
  });

export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: () => api.get<DocumentTemplate[]>("/documents/templates") });

export const useNotifications = (userId?: string) =>
  useQuery({
    queryKey: [...keys.notifications, userId],
    queryFn: () => api.get<Notification[]>("/notifications"),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });

export const useOnboarding = () => useQuery({ queryKey: keys.onboarding, queryFn: () => api.get<OnboardingPlan>("/onboarding/me"), retry: false });

export const useEmployees = () => useQuery({ queryKey: keys.employees, queryFn: () => api.get<Employee[]>("/employees") });

export const useRequests = (status?: string) => {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  return useQuery({ queryKey: [...keys.requests, status], queryFn: () => api.get<HrRequest[]>(`/employees/requests?${query}`) });
};

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
