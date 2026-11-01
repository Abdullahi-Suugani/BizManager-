import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AppShell } from "./components/AppShell";
import { ReportsPage } from "./pages/ReportsPage";
import { useLocation } from "react-router-dom";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { ActivityLogsPage } from "./pages/ActivityLogsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { InventoryPage } from "./pages/InventoryPage";
import { canAccess } from "./utils/permissions";
import type { Permission } from "./types/auth";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<ShellRoute><DashboardPage /></ShellRoute>} />
        <Route path="/transactions/new" element={<ProtectedRoute permission="invoices.create"><ShellRoute><DashboardPage /></ShellRoute></ProtectedRoute>} />
        <Route path="/transactions/:id/edit" element={<ProtectedRoute permission="invoices.edit"><ShellRoute><DashboardPage /></ShellRoute></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute permission="invoices.view"><ShellRoute><TransactionsPage /></ShellRoute></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute permission="invoices.view"><ShellRoute><TransactionsPage search /></ShellRoute></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute permission="products.view"><ProductsPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute permission="inventory.view"><InventoryPage /></ProtectedRoute>} />
        <Route path="/employees" element={<AdminShellRoute><EmployeesPage /></AdminShellRoute>} />
        <Route path="/customers" element={<ProtectedRoute permission="customers.view"><CustomersPage /></ProtectedRoute>} />
        <Route path="/activity" element={<AdminShellRoute><ActivityLogsPage /></AdminShellRoute>} />
        <Route path="/reports" element={<ProtectedRoute permission="reports.view"><ReportsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: Permission }) {
  const { user, isReady } = useAuth();

  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-slate-600">Checking your session...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (permission && !canAccess(user, permission)) return <PermissionDenied />;

  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-slate-600">Checking your session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}

function ShellRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-slate-600">Checking your session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <AppShell currentPath={location.pathname} isMenuOpen={isMenuOpen} onMenuOpen={() => setIsMenuOpen(true)} onMenuClose={() => setIsMenuOpen(false)}>{children}</AppShell>;
}

function AdminShellRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-slate-600">Checking your session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;
  return <ShellRoute>{children}</ShellRoute>;
}

function PermissionDenied() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] p-6"><section role="alert" className="max-w-lg rounded border border-amber-300 bg-white p-6 text-center shadow-sm"><h1 className="text-xl font-bold text-slate-900">Permission denied</h1><p className="mt-2 text-slate-600">Your account does not have permission to access this page. Contact an Admin if you need access.</p></section></main>;
}
