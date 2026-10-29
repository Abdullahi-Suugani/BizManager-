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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<ShellRoute><DashboardPage /></ShellRoute>} />
        <Route path="/transactions/new" element={<ShellRoute><DashboardPage /></ShellRoute>} />
        <Route path="/transactions" element={<ShellRoute><TransactionsPage /></ShellRoute>} />
        <Route path="/search" element={<ShellRoute><TransactionsPage search /></ShellRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/employees" element={<AdminShellRoute><EmployeesPage /></AdminShellRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-slate-600">Checking your session...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
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
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <ShellRoute>{children}</ShellRoute>;
}
