import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Users, Cpu, MessagesSquare, ArrowLeft, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import clsx from "clsx";
import BrandMark from "../../components/BrandMark.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, labelKey: "admin.nav.dashboard", end: true },
  { to: "/admin/users", icon: Users, labelKey: "admin.nav.users" },
  { to: "/admin/models", icon: Cpu, labelKey: "admin.nav.models" },
  { to: "/admin/conversations", icon: MessagesSquare, labelKey: "admin.nav.conversations" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentItem = NAV_ITEMS.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const currentLabel = currentItem ? t(currentItem.labelKey) : t("admin.nav.fallbackTitle");

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-2 py-3">
        <BrandMark size={30} />
        <span className="font-display font-semibold text-sm tracking-tight">Chat AI Admin</span>
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label={t("admin.layout.closeMenu")}
          className="md:hidden ms-auto p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 mt-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors",
                isActive ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow" : "hover:bg-black/5 dark:hover:bg-white/5"
              )
            }
          >
            <Icon size={17} /> {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 pt-2 border-t border-edge-light dark:border-edge-dark">
        <button
          onClick={() => navigate("/chat")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft size={17} /> {t("admin.layout.backToChat")}
        </button>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-glow">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate leading-tight">{user?.username}</p>
            <p className="text-[11px] opacity-50 truncate leading-tight">{t("admin.layout.roleLabel")}</p>
          </div>
          <Tooltip label={t("sidebar.logout")} side="top">
<button onClick={logout} aria-label={t("sidebar.logout")} className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
            <LogOut size={15} />
          </button>
</Tooltip>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-surface-light dark:bg-surface-dark text-black dark:text-white relative overflow-hidden">
      <div className="aurora-bg" />

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar: static on desktop, sliding drawer on mobile */}
      <aside
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-40 w-64 shrink-0 glass border-r border-edge-light dark:border-edge-dark flex flex-col p-3 transition-transform duration-300",
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-edge-light dark:border-edge-dark glass">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t("admin.layout.openMenu")}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-semibold text-sm tracking-tight">{currentLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}