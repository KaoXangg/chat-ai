import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation, useOutlet } from "react-router-dom";
import { Sparkles, ShieldCheck, Zap, Cpu, Sun, Moon } from "lucide-react";
import clsx from "clsx";
import BrandMark from "./BrandMark.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { EASE, getTransitionKind, pageVariants } from "./AuthMotion.jsx";
import { AuthDraftProvider } from "../context/AuthDraftContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const PERKS = [
  { icon: Cpu, key: "auth.layout.perk1" },
  { icon: Zap, key: "auth.layout.perk2" },
  { icon: ShieldCheck, key: "auth.layout.perk3" },
];

const TABS = [
  { to: "/login", key: "auth.layout.tabLogin" },
  { to: "/register", key: "auth.layout.tabRegister" },
];

/* ---------- Khu thương hiệu: chỉ reveal MỘT lần khi shell mount, không chạy lại khi đổi trang ---------- */
const brandGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const brandItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function BrandPanel() {
  const { t } = useI18n();
  return (
    <motion.aside
      variants={brandGroup}
      initial="hidden"
      animate="show"
      className="hidden lg:flex w-[46%] max-w-[620px] relative z-10 flex-col justify-between p-12 xl:p-14 border-r border-edge-light dark:border-edge-dark bg-white/40 dark:bg-white/[0.015] backdrop-blur-xl"
    >
      <motion.div variants={brandItem} className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <BrandMark size={38} className="drop-shadow-sm" />
        </motion.div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg tracking-tight leading-none">Chat AI</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-brand-500 dark:text-brand-400 font-semibold mt-0.5">
            Enterprise Suite
          </span>
        </div>
      </motion.div>

      <div className="my-auto py-8">
        <motion.div
          variants={brandItem}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 mb-5"
        >
          <Sparkles size={13} className="text-brand-500 shrink-0" />
          <span>{t("auth.layout.badge")}</span>
        </motion.div>

        <motion.h1
          variants={brandItem}
          className="font-display text-3xl xl:text-4xl font-bold tracking-tight leading-tight max-w-md text-zinc-900 dark:text-white"
        >
          {t("auth.layout.headline")}
        </motion.h1>

        <motion.p
          variants={brandItem}
          className="text-sm text-zinc-600 dark:text-zinc-400 mt-4 leading-relaxed max-w-md"
        >
          {t("auth.layout.tagline")}
        </motion.p>

        <motion.div
          variants={brandItem}
          className="mt-8 p-4 rounded-2xl glass border border-edge-light dark:border-edge-dark shadow-sm max-w-md bg-white/60 dark:bg-zinc-900/40"
        >
          <div className="flex items-center justify-between pb-3 border-b border-edge-light dark:border-edge-dark text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">
                gemini-1.5-pro • groq-llama-3.3
              </span>
            </div>
            <span className="text-[10px] font-mono text-brand-500 font-semibold">⚡ 45ms</span>
          </div>

          <div className="pt-3 space-y-2.5">
            {PERKS.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                <span className="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                  <Icon size={13} />
                </span>
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.footer
        variants={brandItem}
        className="pt-6 border-t border-edge-light dark:border-edge-dark flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500"
      >
        <span>{t("auth.layout.copyright", { year: new Date().getFullYear() })}</span>
        <span className="font-mono text-[10px]">v2.4.0</span>
      </motion.footer>
    </motion.aside>
  );
}

/* ---------- Tab Đăng nhập / Đăng ký: nằm ngoài vùng chuyển cảnh nên pill trượt liên tục ---------- */
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
          animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="overflow-hidden"
        >
          <nav
            aria-label="Auth"
            className="relative flex items-center p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-edge-light dark:border-edge-dark"
          >
            {TABS.map((tab) => {
              const active = pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-current={active ? "page" : undefined}
                  className="relative flex-1 text-center py-2 text-xs font-semibold tracking-wide z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  {active && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-black/[0.04] dark:border-white/[0.08] -z-10"
                    />
                  )}
                  <span
                    className={clsx(
                      "relative transition-colors duration-300",
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
 * Chiều cao card đổi theo nội dung bằng spring tắt dần (không nảy):
 * form dài hơn/ngắn hơn không làm layout nhảy. Có đệm 12px để ring/shadow của input không bị cắt.
 */
const PAD = 12;
function AutoHeight({ children }) {
  const reduceMotion = useReducedMotion();
  const innerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const measure = () => setHeight(el.offsetHeight + PAD * 2);
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
      transition={reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.38, bounce: 0 }}
      style={{ margin: -PAD, padding: PAD, overflow: "hidden" }}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

/** Tính kiểu chuyển cảnh từ cặp (trang trước, trang hiện tại); Back/Forward của trình duyệt cho kết quả đúng chiều. */
function useTransitionKind(pathname) {
  const ref = useRef({ path: pathname, prev: null });
  if (ref.current.path !== pathname) ref.current = { path: pathname, prev: ref.current.path };
  return getTransitionKind(ref.current.prev, pathname);
}

export default function AuthShell() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const kind = useTransitionKind(pathname);
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <AuthDraftProvider>
      <div className="min-h-screen w-full flex bg-[#f8f9fd] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 relative overflow-hidden select-text">
        {/* Nền: 1 lớp duy nhất chuyển động rất chậm (transform), không chạy lại khi đổi trang */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="auth-ambient absolute inset-0">
            <div className="absolute -top-[25%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-brand-500/10 dark:bg-brand-600/[0.08] blur-[120px]" />
            <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-ion-500/10 dark:bg-ion-500/[0.06] blur-[130px]" />
          </div>
          <div
            className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
        </div>

        {/* Góc trên bên phải: giữ nguyên vị trí và trạng thái ở mọi trang auth */}
        <header className="absolute top-4 end-4 sm:top-6 sm:end-8 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("auth.theme.toLight") : t("auth.theme.toDark")}
            title={theme === "dark" ? t("auth.theme.toLight") : t("auth.theme.toDark")}
            className="relative w-9 h-9 inline-flex items-center justify-center rounded-full glass border border-edge-light dark:border-edge-dark text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -40, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 40, scale: 0.7 }}
                transition={{ duration: 0.16 }}
                className="flex"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <LanguageSwitcher mode="ui" align="end" />
        </header>

        <BrandPanel />

        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 overflow-y-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-[420px] rounded-3xl p-7 sm:p-9 glass border border-edge-light dark:border-white/[0.08] shadow-2xl backdrop-blur-2xl bg-white/80 dark:bg-zinc-900/60 my-auto"
          >
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <BrandMark size={44} className="mb-2.5 drop-shadow-md" />
              <span className="font-display font-bold text-base tracking-tight">Chat AI</span>
            </div>

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
          </motion.div>
        </main>
      </div>
    </AuthDraftProvider>
  );
}
