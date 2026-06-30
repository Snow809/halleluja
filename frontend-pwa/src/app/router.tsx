import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, mobileHomeForShell } from "./AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LoginPage } from "@/features/auth/LoginPage";
import { MfaPage } from "@/features/auth/MfaPage";
import { ConsentPage } from "@/features/auth/ConsentPage";
import { MobileLayout } from "@/layouts/MobileLayout";
import { EmployeeHome } from "@/features/mobile/EmployeeHome";
import { VacationsPage } from "@/features/mobile/VacationsPage";
import { DocumentsPage } from "@/features/mobile/DocumentsPage";
import { RequestDocumentPage } from "@/features/mobile/RequestDocumentPage";
import { OnboardingPage } from "@/features/mobile/OnboardingPage";
import { ManagerHome, ManagerQvt, ManagerRequests, ManagerTeam } from "@/features/mobile/ManagerPages";
import { AssistantPage } from "@/features/mobile/AssistantPage";
import { NotificationsPage } from "@/features/mobile/NotificationsPage";
import { SettingsPage } from "@/features/mobile/SettingsPage";
import { DesktopRequiredPage } from "@/features/mobile/DesktopRequiredPage";

export function AppRouter() {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen label="Ouverture de l’application..." />;

  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/mfa" element={<PublicOnly><MfaPage /></PublicOnly>} />
      <Route path="/consent" element={<RequireSession allowMissingConsent><ConsentPage /></RequireSession>} />
      <Route path="/desktop-required" element={<RequireSession allowUnsupported allowMissingConsent><DesktopRequiredPage /></RequireSession>} />

      <Route element={<RequireSession roles={["employee", "manager"]}><MobileLayout /></RequireSession>}>
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/employee" element={<RequireSession roles={["employee"]}><MobileLayout /></RequireSession>}>
        <Route index element={<Navigate to="/employee/home" replace />} />
        <Route path="home" element={<EmployeeHome />} />
        <Route path="vacations" element={<VacationsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="request-document" element={<RequestDocumentPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>

      <Route path="/manager" element={<RequireSession roles={["manager"]}><MobileLayout /></RequireSession>}>
        <Route index element={<Navigate to="/manager/home" replace />} />
        <Route path="home" element={<ManagerHome />} />
        <Route path="team" element={<ManagerTeam />} />
        <Route path="requests" element={<ManagerRequests />} />
        <Route path="vacations" element={<VacationsPage />} />
        <Route path="request-document" element={<RequestDocumentPage />} />
        <Route path="qvt" element={<ManagerQvt />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  if (auth.user) {
    if (!auth.user.termsAccepted) return <Navigate to="/consent" replace />;
    return <Navigate to={mobileHomeForShell(auth.shell)} replace />;
  }
  return children;
}

function RequireSession({
  children,
  roles,
  allowUnsupported = false,
  allowMissingConsent = false,
}: {
  children: JSX.Element;
  roles?: Array<"employee" | "manager">;
  allowUnsupported?: boolean;
  allowMissingConsent?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!allowMissingConsent && !auth.user.termsAccepted) return <Navigate to="/consent" replace />;
  if (!allowUnsupported && (auth.shell === "hr" || auth.shell === "admin" || auth.shell === "qvt")) return <Navigate to="/desktop-required" replace />;
  if (roles && (!auth.shell || !roles.includes(auth.shell as "employee" | "manager"))) return <Navigate to={mobileHomeForShell(auth.shell)} replace />;
  return children;
}

function RootRedirect() {
  const auth = useAuth();
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.user.termsAccepted) return <Navigate to="/consent" replace />;
  return <Navigate to={mobileHomeForShell(auth.shell)} replace />;
}
