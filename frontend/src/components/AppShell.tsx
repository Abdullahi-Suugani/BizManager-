import { Menu } from "lucide-react";
import { MobileSidebar, Sidebar } from "../pages/DashboardPage";

export function AppShell({ children, currentPath, isMenuOpen, onMenuOpen, onMenuClose }: { children: React.ReactNode; currentPath: string; isMenuOpen: boolean; onMenuOpen: () => void; onMenuClose: () => void }) {
  return <main className="flex min-h-screen bg-[#f5f7f6] text-slate-950"><Sidebar currentPath={currentPath} /><MobileSidebar currentPath={currentPath} isOpen={isMenuOpen} onClose={onMenuClose} /><button onClick={onMenuOpen} className="fixed left-4 top-4 z-30 rounded-md bg-[#0d1c1e] p-2 text-white shadow lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>{children}</main>;
}
