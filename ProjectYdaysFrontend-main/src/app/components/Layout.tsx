import { lazy, Suspense, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Bot,
  Calendar,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Map,
  MessagesSquare,
  Menu,
  Settings,
  Shield,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { NotificationsPanel } from "./shared/NotificationsPanel";
import { AllNotifications } from "./shared/AllNotifications";
import { useAppContext } from "../contexts/AppContext";
import { useNotifications } from "../api/queries";

export type Role = "employee" | "hr" | "manager" | "admin";
const MiniAIAssistant = lazy(() =>
  import("./shared/MiniAIAssistant").then((module) => ({ default: module.MiniAIAssistant })),
);

const navigation: Record<Role, Array<{ to: string; label: string; icon: typeof Menu }>> = {
  employee: [
    { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/vacations", label: "Congés", icon: Calendar },
    { to: "/employee/request-document", label: "Demande document", icon: FileText },
    { to: "/employee/documents", label: "Mes documents", icon: FolderOpen },
    { to: "/employee/onboarding", label: "Onboarding", icon: Map },
    { to: "/assistant", label: "Assistant IA", icon: Bot },
    { to: "/settings", label: "Paramètres", icon: Settings },
  ],
  hr: [
    { to: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/hr/employees", label: "Annuaire", icon: Users },
    { to: "/hr/vacations", label: "Mes congés", icon: Calendar },
    { to: "/hr/request-document", label: "Demander document", icon: FileText },
    { to: "/hr/documents", label: "Bibliothèque", icon: FolderOpen },
    { to: "/hr/requests", label: "Demandes", icon: FileText },
    { to: "/hr/inbox", label: "Messages RH", icon: MessagesSquare },
    { to: "/hr/ai-supervision", label: "Supervision IA", icon: Shield },
    { to: "/assistant", label: "Assistant IA", icon: Bot },
    { to: "/settings", label: "Paramètres", icon: Settings },
  ],
  manager: [
    { to: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/manager/team", label: "Équipe", icon: Users },
    { to: "/manager/vacations", label: "Mes congés", icon: Calendar },
    { to: "/manager/request-document", label: "Demander document", icon: FileText },
    { to: "/manager/requests", label: "Demandes", icon: FileText },
    { to: "/manager/risks", label: "Alertes risques", icon: AlertTriangle },
    { to: "/assistant", label: "Assistant IA", icon: Bot },
    { to: "/settings", label: "Paramètres", icon: Settings },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/accounts", label: "Comptes", icon: Shield },
    { to: "/admin/employees", label: "Employés", icon: Users },
    { to: "/admin/vacations", label: "Mes congés", icon: Calendar },
    { to: "/admin/request-document", label: "Demander document", icon: FileText },
    { to: "/admin/documents", label: "Documents", icon: FolderOpen },
    { to: "/admin/requests", label: "Demandes", icon: FileText },
    { to: "/admin/risks", label: "QVT & risques", icon: AlertTriangle },
    { to: "/admin/ai-supervision", label: "Supervision IA", icon: Bot },
    { to: "/settings", label: "Paramètres", icon: Settings },
  ],
};

export function Layout() {
  const { user, shell, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniChatOpen, setMiniChatOpen] = useState(false);
  const { isNotificationsOpen, toggleNotifications } = useAppContext();
  const notifications = useNotifications(user?.userId);
  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const role = shell as Role;

  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-white/90 dark:bg-slate-900/95">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="font-extrabold text-slate-900 dark:text-white">INTELLI-TALENT</div>
        <div className="text-xs text-slate-500 mt-1">{user?.role}</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation[role].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button onClick={doLogout} className="m-4 p-3 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50">
        <LogOut size={18} /> Déconnexion
      </button>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="hidden lg:block w-64 border-r border-slate-200 dark:border-slate-800"><Sidebar /></aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full shadow-2xl"><Sidebar /></aside>
        </div>
      ) : null}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-18 px-4 sm:px-8 py-4 flex items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2"><Menu size={21} /></button>
          <div className="hidden sm:block">
            <div className="font-bold text-slate-900 dark:text-white">{user?.fullName}</div>
            <div className="text-xs text-slate-500">{user?.employee?.position?.title ?? user?.role}</div>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Ouvrir le mini assistant" onClick={() => setMiniChatOpen((open) => !open)} className="p-2.5 rounded-xl border bg-white dark:bg-slate-800"><Bot size={18} /></button>
            <button onClick={toggleNotifications} className="relative p-2.5 rounded-xl border bg-white dark:bg-slate-800">
              <Bell size={18} />
              {unread ? <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{unread}</span> : null}
            </button>
            <button onClick={() => navigate("/profile")} className="p-2.5 rounded-xl bg-blue-600 text-white"><UserCircle size={18} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8"><Outlet /></main>
      </div>
      {isNotificationsOpen ? <NotificationsPanel /> : null}
      <AllNotifications />
      {miniChatOpen ? <Suspense fallback={null}><MiniAIAssistant onClose={() => setMiniChatOpen(false)} /></Suspense> : null}
      {mobileOpen ? <button className="fixed top-4 right-4 z-[60] lg:hidden text-white" onClick={() => setMobileOpen(false)}><X /></button> : null}
    </div>
  );
}
