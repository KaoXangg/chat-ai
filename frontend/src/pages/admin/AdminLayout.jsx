import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Users, Cpu, MessagesSquare, MessageSquare, ArrowUpRight, LogOut, Menu, X, ChevronRight, Dices, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import clsx from "clsx";
import BrandMark from "../../components/BrandMark.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import UserAvatar from "../../components/UserAvatar.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";
import LanguageSwitcher from "../../components/LanguageSwitcher.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, labelKey: "admin.nav.dashboard", end: true },
  { to: "/admin/users", icon: Users, labelKey: "admin.nav.users" },
  { to: "/admin/models", icon: Cpu, labelKey: "admin.nav.models" },
  { to: "/admin/conversations", icon: MessagesSquare, labelKey: "admin.nav.conversations" },
];

const SIDEBAR_KEY = "admin-sidebar-collapsed";

export default function AdminLayout() {
  const { user, logout, randomizeAvatar } = useAuth();
  const { t, errorMessage } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const drawerRef = useModalA11y(drawerOpen && isMobile, () => setDrawerOpen(false));
  const sidebarCollapsed = desktopCollapsed && !isMobile;
  const expandedToggleRef = useRef(null);
  const railToggleRef = useRef(null);
  const sidebarFocusPendingRef = useRef(false);

  const toggleSidebar = (collapsed) => {
    sidebarFocusPendingRef.current = true;
    setDesktopCollapsed(collapsed);
  };

  useEffect(() => {
    if (!sidebarFocusPendingRef.current) return;
    sidebarFocusPendingRef.current = false;
    // Wait for the incoming panel's visibility transition to start before focusing it.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        (sidebarCollapsed ? railToggleRef : expandedToggleRef).current?.focus({ preventScroll: true });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, desktopCollapsed ? "1" : "0");
    } catch {
      /* Storage unavailable; the sidebar still works for this session. */
    }
  }, [desktopCollapsed]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setDrawerOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const currentItem = NAV_ITEMS.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const currentLabel = currentItem ? t(currentItem.labelKey) : t("admin.nav.fallbackTitle");

  const handleRandomAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      await randomizeAvatar();
      toast.success(t("sidebar.avatarChanged"));
    } catch (err) {
      toast.error(errorMessage(err, "sidebar.avatarFailed"));
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="workspace-ui admin-shell">
      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden" aria-hidden="true" />
        )}
      </AnimatePresence>
      <aside id="admin-navigation" ref={drawerRef} role={drawerOpen && isMobile ? "dialog" : undefined}
        aria-modal={drawerOpen && isMobile ? true : undefined} inert={isMobile && !drawerOpen ? "" : undefined}
        aria-label={t("admin.nav.fallbackTitle")} tabIndex={-1}
        className={clsx("admin-sidebar", sidebarCollapsed && "is-collapsed", drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div className="admin-sidebar-expanded" inert={sidebarCollapsed ? "" : undefined}>
          <div className="admin-brand">
            <span className="admin-brand-mark"><BrandMark size={32} /></span>
            <div className="admin-brand-copy min-w-0 flex-1">
              <p className="font-display font-semibold tracking-tight">Chat AI</p>
              <p className="text-xs workspace-muted">{t("admin.layout.roleLabel")}</p>
            </div>
            <Tooltip label={t("sidebar.collapse")} className="admin-sidebar-toggle hidden md:inline-flex">
              <button
                ref={expandedToggleRef}
                type="button"
                onClick={() => toggleSidebar(true)}
                aria-label={t("sidebar.collapse")}
                aria-expanded={!sidebarCollapsed}
                aria-controls="admin-navigation"
                className="workspace-icon-button group relative"
              >
                <PanelLeftClose size={18} aria-hidden="true" />
              </button>
            </Tooltip>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("admin.layout.closeMenu")} className="workspace-icon-button md:hidden ms-auto"><X size={19} /></button>
          </div>
          <nav className="admin-nav" aria-label={t("admin.nav.fallbackTitle")}>
            <p className="admin-nav-label">{t("admin.layout.workspace")}</p>
            {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setDrawerOpen(false)} aria-label={t(labelKey)}
                className={({ isActive }) => clsx("admin-nav-item", isActive && "is-active")}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className="admin-nav-text flex-1">{t(labelKey)}</span>
                <ChevronRight size={14} className="admin-nav-chevron" aria-hidden="true" />
              </NavLink>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <button type="button" onClick={() => navigate("/chat")} aria-label={t("admin.layout.backToChat")} className="workspace-route-button workspace-route-button--chat">
              <span className="workspace-route-icon" aria-hidden="true">
                <MessageSquare size={19} strokeWidth={1.8} />
              </span>
              <span className="workspace-route-label">{t("admin.layout.backToChat")}</span>
              <ArrowUpRight size={17} className="workspace-route-arrow" aria-hidden="true" />
            </button>
            <div className="admin-account">
              <Tooltip label={t("sidebar.avatarTip")} side="top" align="start">
                <span className="relative inline-flex">
                  <UserAvatar user={user} size={38} onClick={handleRandomAvatar} title={t("sidebar.avatarRandom")} />
                  {avatarBusy && <span className="absolute inset-0 rounded-full bg-black/40 grid place-items-center pointer-events-none"><Loader2 size={16} className="text-white animate-spin" /></span>}
                </span>
              </Tooltip>
              <div className="admin-account-copy min-w-0 flex-1"><p className="text-sm font-medium truncate">{user?.username}</p><p className="text-xs workspace-muted truncate">{t("admin.layout.roleLabel")}</p></div>
              <Tooltip label={t("sidebar.avatarRandom")} side="top" className="admin-account-randomize inline-flex">
                <button type="button" onClick={handleRandomAvatar} disabled={avatarBusy} aria-label={t("sidebar.avatarRandom")} className="workspace-icon-button admin-account-action disabled:opacity-40">
                  {avatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Dices size={16} />}
                </button>
              </Tooltip>
              <Tooltip label={t("sidebar.logout")} side="top">
                <button type="button" onClick={logout} aria-label={t("sidebar.logout")} className="workspace-icon-button admin-account-action text-red-500 hover:!bg-red-500/10"><LogOut size={16} /></button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="admin-sidebar-rail" inert={sidebarCollapsed ? undefined : ""} aria-hidden={!sidebarCollapsed}
          onClick={() => toggleSidebar(false)}>
          <Tooltip label={t("sidebar.expand")} side="right">
            <button ref={railToggleRef} type="button" aria-label={t("sidebar.expand")} aria-expanded={!sidebarCollapsed}
              aria-controls="admin-navigation" className="workspace-icon-button group relative"
              onClick={(e) => { e.stopPropagation(); toggleSidebar(false); }}>
              <BrandMark size={28} className="transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
              <PanelLeftOpen size={18} aria-hidden="true" className="absolute opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
            </button>
          </Tooltip>
          <nav className="admin-rail-nav" aria-label={t("admin.nav.fallbackTitle")}>
            {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
              <Tooltip key={to} label={t(labelKey)} side="right" className="flex">
                <NavLink to={to} end={end} aria-label={t(labelKey)} onClick={(e) => e.stopPropagation()}
                  className={({ isActive }) => clsx("admin-nav-item", isActive && "is-active")}>
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                </NavLink>
              </Tooltip>
            ))}
          </nav>
          <div className="admin-rail-footer">
            <Tooltip label={t("admin.layout.backToChat")} side="right">
              <button type="button" aria-label={t("admin.layout.backToChat")} className="workspace-icon-button"
                onClick={(e) => { e.stopPropagation(); navigate("/chat"); }}>
                <MessageSquare size={19} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label={t("sidebar.avatarTip")} side="right">
              <span className="relative inline-flex">
                <UserAvatar user={user} size={36} title={t("sidebar.avatarRandom")}
                  onClick={(e) => { e.stopPropagation(); handleRandomAvatar(); }} />
                {avatarBusy && <span className="absolute inset-0 rounded-full bg-black/40 grid place-items-center pointer-events-none"><Loader2 size={16} className="text-white animate-spin" /></span>}
              </span>
            </Tooltip>
            <Tooltip label={t("sidebar.logout")} side="right">
              <button type="button" aria-label={t("sidebar.logout")} className="workspace-icon-button text-red-500 hover:!bg-red-500/10"
                onClick={(e) => { e.stopPropagation(); logout(); }}><LogOut size={16} /></button>
            </Tooltip>
          </div>
        </div>
      </aside>
      <div className="admin-body" inert={drawerOpen && isMobile ? "" : undefined}>
        <header className="admin-header">
          <button onClick={() => setDrawerOpen(true)} aria-label={t("admin.layout.openMenu")} aria-expanded={drawerOpen} aria-controls="admin-navigation" className="workspace-icon-button md:hidden"><Menu size={21} /></button>
          <div className="admin-breadcrumb min-w-0"><span className="hidden sm:inline workspace-muted">{t("admin.nav.fallbackTitle")}</span><ChevronRight size={14} className="hidden sm:inline workspace-muted" /><span className="font-medium truncate">{currentLabel}</span></div>
          <div className="flex items-center gap-2 ms-auto shrink-0">
            <LanguageSwitcher className="admin-language-menu" /><ThemeToggle />
            <span className="hidden sm:inline-flex border-s ps-3 ms-1 border-edge-light dark:border-edge-dark"><UserAvatar user={user} size={34} /></span>
          </div>
        </header>
        <main className="admin-main"><div className="admin-content"><Outlet /></div></main>
      </div>
    </div>
  );
}
