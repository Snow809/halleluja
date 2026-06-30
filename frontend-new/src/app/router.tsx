import { lazy, Suspense } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";

const lazyNamed = <T extends Record<string, any>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] }));

const EmployeeDashboard = lazyNamed(() => import("@/features/employee/EmployeeDashboard"), "EmployeeDashboard");
const EmployeeActivities = lazyNamed(() => import("@/features/employee/EmployeeActivities"), "EmployeeActivities");
const RequestVacation = lazyNamed(() => import("@/features/employee/RequestVacation"), "RequestVacation");
const RequestDocument = lazyNamed(() => import("@/features/employee/RequestDocument"), "RequestDocument");
const MyDocuments = lazyNamed(() => import("@/features/employee/MyDocuments"), "MyDocuments");
const OnboardingJourney = lazyNamed(() => import("@/features/employee/OnboardingJourney"), "OnboardingJourney");
const HRDashboard = lazyNamed(() => import("@/features/hr/HRDashboard"), "HRDashboard");
const EmployeeDirectory = lazyNamed(() => import("@/features/hr/EmployeeDirectory"), "EmployeeDirectory");
const EmployeeDetail = lazyNamed(() => import("@/features/hr/EmployeeDetail"), "EmployeeDetail");
const EmployeeAccountManagement = lazyNamed(() => import("@/features/hr/EmployeeAccountManagement"), "EmployeeAccountManagement");
const DocumentLibrary = lazyNamed(() => import("@/features/hr/DocumentLibrary"), "DocumentLibrary");
const RequestReview = lazyNamed(() => import("@/features/hr/RequestReview"), "RequestReview");
const AISupervision = lazyNamed(() => import("@/features/hr/AISupervision"), "AISupervision");
const HrInbox = lazyNamed(() => import("@/features/hr/HrInbox"), "HrInbox");
const ManagerDashboard = lazyNamed(() => import("@/features/manager/ManagerDashboard"), "ManagerDashboard");
const Team = lazyNamed(() => import("@/features/manager/Team"), "Team");
const TeamRiskAlerts = lazyNamed(() => import("@/features/manager/TeamRiskAlerts"), "TeamRiskAlerts");
const AIAssistant = lazyNamed(() => import("@/features/shared/AIAssistant"), "AIAssistant");
const Profile = lazyNamed(() => import("@/features/shared/Profile"), "Profile");
const Settings = lazyNamed(() => import("@/features/shared/Settings"), "Settings");

function ScreenLoader() {
  return (
    <Center minH="45vh">
      <Spinner color="brand.500" />
    </Center>
  );
}

function ProtectedApp() {
  const { user, loading, shell } = useAuth();
  if (loading) return <ScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!shell) return <Navigate to="/unsupported-role" replace />;
  return <AppLayout />;
}

function HomeRedirect() {
  const { user, loading, shell } = useAuth();
  if (loading) return <ScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${shell ?? "login"}/dashboard`} replace />;
}

function RoleOnly({ role }: { role: "employee" | "hr" | "manager" | "admin" }) {
  const { shell } = useAuth();
  if (!shell) return <Navigate to="/login" replace />;
  return shell === role ? <Outlet /> : <Navigate to={`/${shell}/dashboard`} replace />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unsupported-role" element={<Center minH="100vh"><Text>Rôle non pris en charge.</Text></Center>} />
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
