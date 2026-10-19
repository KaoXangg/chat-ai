import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation, useOutlet } from "react-router-dom";
import clsx from "clsx";
import BrandMark from "./BrandMark.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import AuthHeroShowcase from "./AuthHeroShowcase.jsx";
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
      <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center bg-[#eef2f6] dark:bg-[#0a0b10] text-zinc-900 dark:text-zinc-100 p-3 sm:p-5 md:p-8 transition-colors duration-200 relative select-none">
        {/* Main Floating Rounded Card Container */}
        <div className="w-full max-w-[1040px] min-h-[660px] lg:min-h-[700px] bg-white dark:bg-[#12131b] rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.07)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-zinc-200/90 dark:border-white/[0.08] overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative">
          
          {/* LEFT PANEL: 3D Isometric Artwork (Matching Chat AI Brand) */}
          <div className="hidden lg:flex p-3 xl:p-3.5 z-10">
            <AuthHeroShowcase />
          </div>

          {/* RIGHT PANEL: Branding & Form Content */}
          <div className="flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-11 z-10 w-full overflow-y-auto">
            {/* Top Bar: Brand Logo & Controls */}
            <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
              <Link
                to="/login"
                className="group flex items-center gap-2.5 outline-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500/40"
                aria-label="Chat AI Home"
              >
                <BrandMark size={30} className="transition-transform duration-200 group-hover:scale-105" />
                <span className="font-display font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
                  Chat AI
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher mode="ui" align="end" />
              </div>
            </div>

            {/* Middle Form Area */}
            <div className="w-full max-w-[380px] mx-auto my-auto py-2">
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

            {/* Bottom Disclaimer */}
            <div className="pt-6 sm:pt-8 text-center">
              <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-sm mx-auto">
                {t("auth.login.bottomDisclaimer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthDraftProvider>
  );
}

