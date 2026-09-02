import { LayoutDashboard, LogOut, Receipt, Sparkles, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/invoices", label: "Invoices", icon: Receipt },
  { to: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2 px-5">
          <Sparkles className="h-5 w-5 text-copper" />
          <span className="font-semibold">Ledgerly</span>
        </div>
        <nav className="flex gap-1 px-3 pb-3 lg:flex-col">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? "bg-paper text-ink" : "text-ink-soft hover:bg-paper"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={logout}
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-paper"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </nav>
        <p className="hidden px-5 pb-5 text-xs text-ink-soft lg:block">{user?.email}</p>
      </aside>
      <main className="p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
