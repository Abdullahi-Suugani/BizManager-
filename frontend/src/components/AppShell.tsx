import { ChevronDown, Menu, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { MobileSidebar, Sidebar } from "../pages/DashboardPage";
import { useAuth } from "../context/AuthContext";

export function AppShell({ children, currentPath, isMenuOpen, onMenuOpen, onMenuClose }: { children: React.ReactNode; currentPath: string; isMenuOpen: boolean; onMenuOpen: () => void; onMenuClose: () => void }) {
  const { user, logout } = useAuth();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    return () => menuButtonRef.current?.focus();
  }, [isMenuOpen]);
  return (
    <main className="app-shell bg-[#f5f7f6] text-slate-950">
      <Sidebar currentPath={currentPath} />
      <MobileSidebar currentPath={currentPath} isOpen={isMenuOpen} onClose={onMenuClose} />
      <section className="app-main">
        <header className="app-header">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={onMenuOpen}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0d1c1e] text-white shadow lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="truncate text-lg font-bold text-emerald-800 sm:text-xl">BizManager</h2>
          </div>
          <details className="relative shrink-0">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 sm:gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-40 truncate font-semibold">{user?.name ?? "User"}</p>
                <p className="text-xs capitalize text-slate-500">{user?.role.toLowerCase()}</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              {user ? <Link to="/change-password" className="block min-h-11 rounded px-3 py-3 text-sm text-slate-700 hover:bg-slate-100">Change Password</Link> : null}
              <button onClick={logout} className="min-h-11 w-full rounded px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-100">Log out</button>
            </div>
          </details>
        </header>
        <div className="app-content">{children}</div>
      </section>
    </main>
  );
}
