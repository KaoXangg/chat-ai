import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation, useOutlet } from "react-router-dom";
import clsx from "clsx";
import BrandMark from "./BrandMark.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { EASE, getTransitionKind, pageVariants } from "./AuthMotion.jsx";
import { AuthDraftProvider } from "../context/AuthDraftContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const TABS = [
  { to: "/login", key: "auth.layout.tabLogin" },
  { to: "/register", key: "auth.layout.tabRegister" },
];

/**
 * Tab switcher Đăng nhập / Đăng ký dạng segmented control tinh tế.
 * Tự động ẩn khi ở /forgot-password và /reset-password.
 */
function AuthTabs() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const show = TABS.some((tab) => tab.to === pathname);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="auth-tabs"
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: "auto", opacity: 1, marginBottom: 14 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="overflow-hidden"
        >
          <nav
            aria-label="Auth navigation tabs"
            className="relative flex items-center h-9 p-0.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80"
          >
            {TABS.map((tab) => {
              const active = pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-current={active ? "page" : undefined}
                  className="relative flex-1 text-center py-1.5 text-xs font-semibold tracking-normal z-10 rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  {active && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      className="absolute inset-0 rounded-[9px] bg-white dark:bg-zinc-800 shadow-xs border border-black/[0.04] dark:border-white/[0.08] -z-10"
                    />
                  )}
                  <span
                    className={clsx(
                      "relative transition-colors duration-150",
                      active
                        ? "text-zinc-900 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    {t(tab.key)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Co giãn chiều cao mượt mà theo nội dung form, không làm giật card hay cắt xén focus ring.
 */
function AutoHeight({ children }) {
  const reduceMotion = useReducedMotion();
  const innerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE }}
      className="overflow-visible"
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

function useTransitionKind(pathname) {
  const ref = useRef({ path: pathname, prev: null });
  if (ref.current.path !== pathname) ref.current = { path: pathname, prev: ref.current.path };
  return getTransitionKind(ref.current.prev, pathname);
}

export default function AuthShell() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const kind = useTransitionKind(pathname);
  const { t } = useI18n();

  return (
    <AuthDraftProvider>
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-[#fbfbfc] dark:bg-[#0c0d12] text-zinc-900 dark:text-zinc-100 relative transition-colors duration-200">
        {/* Nền tinh tế: ambient radial glow mờ ảo thanh nhã, không gradient tím đậm */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-brand-500/[0.035] dark:bg-brand-500/[0.05] rounded-full blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Thanh tiêu đề trên cùng: Brand logo góc trái, cụm Language Switcher & Theme Switcher góc phải */}
        <header className="relative z-30 w-full px-4 py-2.5 sm:px-8 sm:py-3 flex items-center justify-between max-w-6xl mx-auto shrink-0">
          <Link
            to="/login"
            className="group flex items-center gap-2.5 outline-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-label="Chat AI Home"
          >
            <BrandMark size={28} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="font-display font-bold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white">
              Chat AI
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher mode="ui" align="end" />
          </div>
        </header>

        {/* Khung nội dung chính: Bố cục trung tâm tinh gọn, tự động co giãn theo viewport thực tế */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-2.5 sm:py-4 md:py-5 w-full relative z-10">
          <div className="w-full max-w-[416px] mx-auto my-auto">
            <div className="rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#13141b] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_12px_28px_-6px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] px-6 py-5 sm:px-7 sm:py-6 transition-[background-color,border-color] duration-200">
              <AuthTabs />

              <AutoHeight>
                <AnimatePresence mode="wait" custom={kind}>
                  <motion.div
                    key={pathname}
                    custom={kind}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {outlet}
                  </motion.div>
                </AnimatePresence>
              </AutoHeight>
            </div>
          </div>
        </main>

        {/* Chân trang tối giản */}
        <footer className="relative z-20 py-2 sm:py-2.5 px-4 text-center text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-600 shrink-0">
          <span>{t("auth.layout.copyright", { year: new Date().getFullYear() })}</span>
        </footer>
      </div>
    </AuthDraftProvider>
  );
}
