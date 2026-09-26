import { Route, Routes } from 'react-router-dom';
import { UserRole } from '@jeddah/shared';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuditPage } from './pages/AuditPage';
import { DashboardPage } from './pages/DashboardPage';
import { DailyWorkPage } from './pages/DailyWorkPage';
import { DistributorsPage } from './pages/DistributorsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { UsersPage } from './pages/UsersPage';

function AuthenticatedPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

export function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<AuthenticatedPage><DashboardPage /></AuthenticatedPage>} path="/" />
      <Route element={<AuthenticatedPage><ProtectedRoute roles={[UserRole.PROCESSOR]}><DailyWorkPage /></ProtectedRoute></AuthenticatedPage>} path="/work" />
      <Route element={<AuthenticatedPage><ReturnsPage /></AuthenticatedPage>} path="/returns" />
      <Route element={<AuthenticatedPage><ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPERVISOR]}><ReportsPage /></ProtectedRoute></AuthenticatedPage>} path="/reports" />
      <Route element={<AuthenticatedPage><ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPERVISOR]}><DistributorsPage /></ProtectedRoute></AuthenticatedPage>} path="/distributors" />
      <Route element={<AuthenticatedPage><ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPERVISOR]}><AuditPage /></ProtectedRoute></AuthenticatedPage>} path="/audit" />
      <Route element={<AuthenticatedPage><ProtectedRoute roles={[UserRole.ADMIN]}><UsersPage /></ProtectedRoute></AuthenticatedPage>} path="/users" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
