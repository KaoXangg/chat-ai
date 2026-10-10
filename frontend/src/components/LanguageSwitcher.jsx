import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe, Search, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { UI_CODES } from "../i18n/dictionaries.js";
import { AI_AUTO, LANGUAGES, LANGUAGE_MAP } from "../i18n/languages.js";
import { useToast } from "../context/ToastContext.jsx";
import { withViewTransition } from "../utils/viewTransition.js";

// Không dùng emoji cờ: Windows hiển thị chúng thành 2 chữ cái ("VN") nên bị lặp với mã ngôn ngữ ("VI").
const BADGE_OVERRIDES = { "zh-CN": "简", "zh-TW": "繁" };
const badgeOf = (code) => BADGE_OVERRIDES[code] || code.split("-")[0].slice(0, 2).toUpperCase();

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function Row({ selected, onClick, primary, secondary, badge, icon, dir }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-start outline-hidden",
        "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500/40",
        selected
          ? "bg-brand-500/10 text-brand-700 dark:text-brand-200"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.045] dark:hover:bg-white/[0.06] focus-visible:bg-black/[0.045] dark:focus-visible:bg-white/[0.06]"
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "grid place-items-center w-8 h-8 shrink-0 rounded-[10px] text-[11px] font-semibold leading-none tracking-wide transition-colors duration-150",
          selected
            ? "bg-brand-500 text-white shadow-xs shadow-brand-500/30"
            : "bg-black/[0.05] dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400"
        )}
      >
        {icon || badge}
      </span>
      <span className="flex-1 min-w-0">
        <span dir={dir} className="block truncate text-[13.5px] font-medium leading-tight">
          {primary}
        </span>
        {secondary && (
          <span className="block truncate text-[11.5px] leading-tight mt-0.5 text-zinc-500 dark:text-zinc-400">
            {secondary}
          </span>
        )}
      </span>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.14 }}
            className="flex shrink-0 text-brand-500"
          >
            <Check size={15} className="stroke-[2.6]" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/**
 * Bộ chọn ngôn ngữ.
 * mode="full": 2 tab - "Giao diện" (ngôn ngữ UI) và "AI trả lời" (mọi ngôn ngữ + Tự động).
 * mode="ui":   chỉ ngôn ngữ giao diện (gọn, dùng ở AuthShell).
 * Đổi ngôn ngữ giao diện được áp dụng SAU khi dropdown đã đóng và cross-fade bằng View Transition
 * (nếu trình duyệt hỗ trợ) để toàn trang không bị nhấp nháy.
 */
export default function LanguageSwitcher({ mode = "full", align = "auto", className = "" }) {
  const { t, lang, setLang, aiLang, setAiLang, errorMessage, dir } = useI18n();
  const toast = useToast();
  const tabPillId = useId();
  const showAi = mode === "full";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ui");
  const [query, setQuery] = useState("");
  const [alignEnd, setAlignEnd] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const pendingLangRef = useRef(null);

  const uiItems = useMemo(() => LANGUAGES.filter((l) => UI_CODES.has(l.code)), []);
  const isSimpleUi = mode === "ui" && uiItems.length <= 8;

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Đưa focus vào dropdown khi mở (ô tìm kiếm nếu có, nếu không thì mục đang chọn).
  useEffect(() => {
    if (!open) return;
    const target = isSimpleUi
      ? listRef.current?.querySelector('[aria-selected="true"]') || listRef.current?.querySelector('[role="option"]')
      : searchRef.current;
    target?.focus({ preventScroll: true });
  }, [open, isSimpleUi]);

  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const panelWidth = Math.min(352, window.innerWidth - 32);
      if (align === "end") setAlignEnd(true);
      else if (align === "start") setAlignEnd(false);
      else setAlignEnd(dir === "rtl" ? rect.right - panelWidth < 16 : rect.left + panelWidth > window.innerWidth - 16);
      setQuery("");
    }
    setOpen((o) => !o);
  };

  const q = normalize(query.trim());
  const matches = (l) => !q || normalize(`${l.name} ${l.native} ${l.code}`).includes(q);

  const activeTab = showAi ? tab : "ui";
  const items = (activeTab === "ui" ? uiItems : LANGUAGES).filter(matches);
  const showAuto = activeTab === "ai" && (!q || normalize(`${t("lang.auto")} auto`).includes(q));

  const current = LANGUAGE_MAP.get(lang);
  const currentCode = badgeOf(lang);

  const pickUi = (code) => {
    if (code !== lang) pendingLangRef.current = code;
    close(true);
  };

  // Áp dụng ngôn ngữ giao diện khi dropdown đã đóng hẳn (sự kiện, không dùng timer).
  const applyPendingLang = () => {
    const code = pendingLangRef.current;
    if (!code) return;
    pendingLangRef.current = null;
    withViewTransition(() => setLang(code));
  };

  const pickAi = async (code) => {
    close(true);
    try {
      await setAiLang(code);
    } catch (err) {
      toast.error(errorMessage(err, "lang.saveFailed"));
    }
  };

  const moveFocus = (e) => {
    const options = [...(listRef.current?.querySelectorAll('[role="option"]') ?? [])];
    if (!options.length) return;
    const index = options.indexOf(document.activeElement);
    let next = null;
    if (e.key === "ArrowDown") next = options[(index + 1) % options.length];
    else if (e.key === "ArrowUp") next = options[(index <= 0 ? options.length : index) - 1];
    else if (e.key === "Home") next = options[0];
    else if (e.key === "End") next = options[options.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const originRight = alignEnd !== (dir === "rtl");

  return (
    <div className={clsx("relative inline-block text-start select-none", className)} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            toggle();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.button")}
        title={t("lang.button")}
        className={clsx(
          "group inline-flex items-center gap-2 h-[34px] sm:h-9 px-2.5 sm:px-3 rounded-xl text-zinc-700 dark:text-zinc-200",
          "border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md",
          "shadow-xs outline-hidden transition-[colors,border-color,box-shadow,transform] duration-150",
          "focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95",
          open
            ? "border-brand-500/60 shadow-[0_0_0_3px_rgba(109,91,255,0.14)] bg-white dark:bg-zinc-800/90"
            : "hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
        )}
      >
        <span
          aria-hidden="true"
          className="grid place-items-center w-5 h-5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors duration-200 group-hover:bg-brand-500/20"
        >
          <Globe size={13} className="transition-transform duration-300 group-hover:rotate-12" />
        </span>
        <span className="font-mono text-xs font-semibold tracking-wider text-zinc-800 dark:text-zinc-200 uppercase">
          {currentCode}
        </span>
        <span className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={clsx(
            "text-zinc-400 dark:text-zinc-500 transition-transform duration-200",
            open && "rotate-180 text-brand-500"
          )}
        />
      </button>

      <AnimatePresence onExitComplete={applyPendingLang}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: originRight ? "top right" : "top left" }}
            className={clsx(
              "absolute z-50 mt-2 rounded-2xl border border-edge-light dark:border-edge-dark glass backdrop-blur-xl shadow-2xl p-1.5",
              isSimpleUi ? "w-64" : "w-[min(22rem,calc(100vw-2rem))]",
              alignEnd ? "end-0" : "start-0"
            )}
          >
            {showAi && (
              <div role="tablist" className="relative flex p-1 mb-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.06]">
                {[
                  ["ui", t("lang.tabUi")],
                  ["ai", t("lang.tabAi")],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => {
                      setTab(id);
                      setQuery("");
                    }}
                    className={clsx(
                      "relative flex-1 py-1.5 text-xs font-medium rounded-lg outline-hidden transition-colors duration-200",
                      "focus-visible:ring-2 focus-visible:ring-brand-500/40",
                      tab === id
                        ? "text-brand-700 dark:text-brand-200"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    {tab === id && (
                      <motion.span
                        layoutId={`lang-tab-${tabPillId}`}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-lg bg-white dark:bg-white/10 shadow-xs"
                      />
                    )}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {isSimpleUi ? (
              <div className="px-2.5 pt-1.5 pb-2">
                <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{t("lang.title")}</p>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{t("lang.uiHint")}</p>
              </div>
            ) : (
              <>
                <p className="px-2.5 pb-2 text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">
                  {activeTab === "ui" ? t("lang.uiHint") : t("lang.aiHint")}
                </p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") moveFocus(e);
                    }}
                    placeholder={t("lang.search")}
                    aria-label={t("lang.search")}
                    className="w-full ps-9 pe-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/60 dark:bg-white/5 outline-hidden focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(109,91,255,0.14)] text-xs transition-[border-color,box-shadow] duration-200"
                  />
                </div>
              </>
            )}

            <div
              ref={listRef}
              role="listbox"
              aria-label={t("lang.title")}
              onKeyDown={moveFocus}
              className="max-h-72 overflow-y-auto space-y-0.5"
            >
              {showAuto && (
                <Row
                  selected={aiLang === AI_AUTO}
                  onClick={() => pickAi(AI_AUTO)}
                  primary={t("lang.auto")}
                  secondary={t("lang.autoHint")}
                  icon={<Sparkles size={15} />}
                />
              )}
              {items.map((l) => (
                <Row
                  key={l.code}
                  selected={activeTab === "ui" ? lang === l.code : aiLang === l.code}
                  onClick={() => (activeTab === "ui" ? pickUi(l.code) : pickAi(l.code))}
                  primary={l.native}
                  secondary={l.native !== l.name ? l.name : undefined}
                  badge={badgeOf(l.code)}
                  dir="auto"
                />
              ))}
              {!showAuto && items.length === 0 && (
                <div className="p-4 text-xs text-center text-zinc-500 dark:text-zinc-400">{t("lang.empty")}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
