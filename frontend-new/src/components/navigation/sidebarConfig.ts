import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  FolderOpen,
  Gauge,
  HeartPulse,
  Inbox,
  Library,
  Map,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AppShell } from "@/api/types";

export type SidebarEntry = { label: string; to: string; icon: LucideIcon; group?: string };

export const sidebarByShell: Record<AppShell, SidebarEntry[]> = {
  employee: [
    { group: "Espace", label: "Dashboard", to: "/employee/dashboard", icon: Gauge },
    { label: "Congés", to: "/employee/vacations", icon: CalendarDays },
    { label: "Demande document", to: "/employee/request-document", icon: FileText },
    { label: "Mes documents", to: "/employee/documents", icon: FolderOpen },
    { label: "Onboarding", to: "/employee/onboarding", icon: Map },
    { group: "ARIA", label: "Assistant IA", to: "/assistant", icon: Bot },
    { group: "Compte", label: "Paramètres", to: "/settings", icon: Settings },
  ],
  hr: [
    { group: "Pilotage", label: "Dashboard", to: "/hr/dashboard", icon: Gauge },
    { label: "Annuaire", to: "/hr/employees", icon: Users },
    { label: "Mes congés", to: "/hr/vacations", icon: CalendarDays },
    { label: "Documents", to: "/hr/documents", icon: Library },
    { label: "Demandes", to: "/hr/requests", icon: FileText },
    { label: "Boîte RH", to: "/hr/inbox", icon: Inbox },
    { group: "ARIA", label: "Assistant IA", to: "/assistant", icon: Bot },
    { group: "Compte", label: "Paramètres", to: "/settings", icon: Settings },
  ],
  manager: [
    { group: "Pilotage", label: "Dashboard", to: "/manager/dashboard", icon: Gauge },
    { label: "Équipe", to: "/manager/team", icon: Users },
    { label: "Mes congés", to: "/manager/vacations", icon: CalendarDays },
    { label: "Demande document", to: "/manager/request-document", icon: FileText },
    { label: "Demandes", to: "/manager/requests", icon: BriefcaseBusiness },
    { label: "QVT équipe", to: "/manager/risks", icon: HeartPulse },
    { group: "ARIA", label: "Assistant IA", to: "/assistant", icon: Bot },
    { group: "Compte", label: "Paramètres", to: "/settings", icon: Settings },
  ],
  admin: [
    { group: "Pilotage", label: "Dashboard", to: "/admin/dashboard", icon: Gauge },
    { label: "Comptes", to: "/admin/accounts", icon: ShieldCheck },
    { label: "Annuaire", to: "/admin/employees", icon: Users },
    { label: "Congés", to: "/admin/vacations", icon: CalendarDays },
    { label: "Documents", to: "/admin/documents", icon: Library },
    { label: "Demandes", to: "/admin/requests", icon: FileText },
    { label: "Audit", to: "/admin/audit", icon: ShieldCheck },
    { group: "IA", label: "Supervision IA", to: "/admin/ai-supervision", icon: ShieldCheck },
    { label: "Assistant IA", to: "/assistant", icon: Bot },
    { group: "Compte", label: "Paramètres", to: "/settings", icon: Settings },
  ],
  qvt: [
    { group: "QVT", label: "Dashboard", to: "/qvt/dashboard", icon: Gauge },
    { label: "Analyses anonymes", to: "/qvt/analytics", icon: HeartPulse },
    { group: "ARIA", label: "Assistant IA", to: "/assistant", icon: Bot },
    { group: "Compte", label: "Paramètres", to: "/settings", icon: Settings },
  ],
};

export function shellLabel(shell?: AppShell | null) {
  if (shell === "employee") return "Collaborateur";
  if (shell === "hr") return "RH";
  if (shell === "manager") return "Manager";
  if (shell === "admin") return "Admin";
  if (shell === "qvt") return "QVT";
  return "Intelli-Talent";
}

export function shellHome(shell?: AppShell | null) {
  return shell ? `/${shell}/dashboard` : "/";
}
