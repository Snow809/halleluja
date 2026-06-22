import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Login } from "./components/Login";
import { Layout } from "./components/Layout";

const lazyNamed = <T extends Record<string, any>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] }));

const EmployeeDashboard = lazyNamed(() => import("./components/employee/Dashboard"), "EmployeeDashboard");
const EmployeeActivities = lazyNamed(() => import("./components/employee/Activities"), "EmployeeActivities");
const RequestVacation = lazyNamed(() => import("./components/employee/RequestVacation"), "RequestVacation");
const RequestDocument = lazyNamed(() => import("./components/employee/RequestDocument"), "RequestDocument");
const MyDocuments = lazyNamed(() => import("./components/employee/MyDocuments"), "MyDocuments");
const OnboardingJourney = lazyNamed(() => import("./components/employee/OnboardingJourney"), "OnboardingJourney");
const HRDashboard = lazyNamed(() => import("./components/hr/Dashboard"), "HRDashboard");
const EmployeeDirectory = lazyNamed(() => import("./components/hr/EmployeeDirectory"), "EmployeeDirectory");
const EmployeeDetail = lazyNamed(() => import("./components/hr/EmployeeDetail"), "EmployeeDetail");
const EmployeeAccountManagement = lazyNamed(() => import("./components/hr/EmployeeAccountManagement"), "EmployeeAccountManagement");
const DocumentLibrary = lazyNamed(() => import("./components/hr/DocumentLibrary"), "DocumentLibrary");
const RequestReview = lazyNamed(() => import("./components/hr/RequestReview"), "RequestReview");
const AISupervision = lazyNamed(() => import("./components/hr/AISupervision"), "AISupervision");
const HrInbox = lazyNamed(() => import("./components/hr/HrInbox"), "HrInbox");
const ManagerDashboard = lazyNamed(() => import("./components/manager/Dashboard"), "ManagerDashboard");
const Team = lazyNamed(() => import("./components/manager/Team"), "Team");
const TeamRiskAlerts = lazyNamed(() => import("./components/manager/TeamRiskAlerts"), "TeamRiskAlerts");
const AIAssistant = lazyNamed(() => import("./components/shared/AIAssistant"), "AIAssistant");
const Profile = lazyNamed(() => import("./components/shared/Profile"), "Profile");
const Settings = lazyNamed(() => import("./components/shared/Settings"), "Settings");

function ScreenLoader() {
  return <div className="min-h-[40vh] grid place-items-center text-slate-500">Chargement…</div>;
}

function ProtectedApp() {
  const { user, loading, shell } = useAuth();
  if (loading) return <ScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!shell) return <Navigate to="/unsupported-role" replace />;
  return <Layout />;
}

function HomeRedirect() {
  const { shell } = useAuth();
  return <Navigate to={`/${shell ?? "login"}/dashboard`} replace />;
}

function RoleOnly({ role }: { role: "employee" | "hr" | "manager" | "admin" }) {
  const { shell } = useAuth();
  return shell === role ? <Outlet /> : <Navigate to={`/${shell}/dashboard`} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unsupported-role" element={<div className="min-h-screen grid place-items-center">Rôle non pris en charge.</div>} />
        <Route element={<ProtectedApp />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route element={<RoleOnly role="employee" />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/activities" element={<EmployeeActivities />} />
            <Route path="/employee/vacations" element={<RequestVacation />} />
            <Route path="/employee/request-document" element={<RequestDocument />} />
            <Route path="/employee/documents" element={<MyDocuments />} />
            <Route path="/employee/onboarding" element={<OnboardingJourney />} />
          </Route>
          <Route element={<RoleOnly role="hr" />}>
            <Route path="/hr/dashboard" element={<HRDashboard />} />
            <Route path="/hr/employees" element={<EmployeeDirectory />} />
            <Route path="/hr/employees/:id" element={<EmployeeDetail />} />
            <Route path="/hr/vacations" element={<RequestVacation />} />
            <Route path="/hr/request-document" element={<RequestDocument />} />
            <Route path="/hr/documents" element={<DocumentLibrary />} />
            <Route path="/hr/requests" element={<RequestReview />} />
            <Route path="/hr/ai-supervision" element={<AISupervision />} />
            <Route path="/hr/inbox" element={<HrInbox />} />
          </Route>
          <Route element={<RoleOnly role="manager" />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/team" element={<Team />} />
            <Route path="/manager/vacations" element={<RequestVacation />} />
            <Route path="/manager/request-document" element={<RequestDocument />} />
            <Route path="/manager/requests" element={<RequestReview />} />
            <Route path="/manager/risks" element={<TeamRiskAlerts />} />
          </Route>
          <Route element={<RoleOnly role="admin" />}>
            <Route path="/admin/dashboard" element={<HRDashboard />} />
            <Route path="/admin/accounts" element={<EmployeeAccountManagement />} />
            <Route path="/admin/employees" element={<EmployeeDirectory />} />
            <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
            <Route path="/admin/vacations" element={<RequestVacation />} />
            <Route path="/admin/request-document" element={<RequestDocument />} />
            <Route path="/admin/documents" element={<DocumentLibrary />} />
            <Route path="/admin/requests" element={<RequestReview />} />
            <Route path="/admin/ai-supervision" element={<AISupervision />} />
            <Route path="/admin/risks" element={<TeamRiskAlerts />} />
          </Route>
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
