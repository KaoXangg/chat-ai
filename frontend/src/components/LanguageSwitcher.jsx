import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe, Search, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { UI_CODES } from "../i18n/dictionaries.js";
import { AI_AUTO, LANGUAGES } from "../i18n/languages.js";
import { useToast } from "../context/ToastContext.jsx";

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function Row({ selected, onClick, primary, secondary, code, icon, dir }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-start transition-colors",
        selected ? "bg-brand-500/10" : "hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {icon && <span className="text-brand-500 shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span dir={dir} className="block text-sm font-medium truncate">
          {primary}
        </span>
        {secondary && <span className="block text-xs opacity-50 truncate">{secondary}</span>}
      </span>
      {code && <span className="text-[10px] uppercase tracking-wide opacity-30 shrink-0">{code}</span>}
      {selected && <Check size={15} className="text-brand-500 shrink-0" />}
    </button>
  );
}

/**
 * Bộ chọn ngôn ngữ.
 * mode="full": 2 tab - "Giao diện" (ngôn ngữ UI) và "AI trả lời" (mọi ngôn ngữ trên thế giới + Tự động).
 * mode="ui":   chỉ ngôn ngữ giao diện (dùng ở trang đăng nhập/đăng ký khi chưa có tài khoản).
 */
export default function LanguageSwitcher({ mode = "full", align = "auto", className = "" }) {
  const { t, lang, setLang, aiLang, setAiLang, errorMessage } = useI18n();
  const toast = useToast();
  const showAi = mode === "full";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ui");
  const [query, setQuery] = useState("");
  const [alignEnd, setAlignEnd] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const panelWidth = Math.min(352, window.innerWidth - 32);
      if (align === "end") setAlignEnd(true);
      else if (align === "start") setAlignEnd(false);
      else setAlignEnd(rect.left + panelWidth > window.innerWidth - 16);
      setQuery("");
    }
    setOpen((o) => !o);
  };

  const q = normalize(query.trim());
  const matches = (l) => !q || normalize(`${l.name} ${l.native} ${l.code}`).includes(q);

  const uiItems = useMemo(() => LANGUAGES.filter((l) => UI_CODES.has(l.code)), []);
  const activeTab = showAi ? tab : "ui";
  const items = (activeTab === "ui" ? uiItems : LANGUAGES).filter(matches);
  const showAuto = activeTab === "ai" && (!q || normalize(`${t("lang.auto")} auto`).includes(q));

  const pickUi = (code) => {
    setLang(code);
    setOpen(false);
  };

  const pickAi = async (code) => {
    setOpen(false);
    try {
      await setAiLang(code);
    } catch (err) {
      toast.error(errorMessage(err, "lang.saveFailed"));
    }
  };

  return (
    <div className={clsx("relative", className)} ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.button")}
        title={t("lang.button")}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium glass border transition-colors",
          open ? "border-brand-400/70" : "border-edge-light dark:border-edge-dark"
        )}
      >
        <Globe size={15} className="text-brand-500" />
        <span className="uppercase text-xs">{lang.split("-")[0]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              "absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-edge-light dark:border-edge-dark bg-white dark:bg-[#14141f] shadow-2xl shadow-black/15 dark:shadow-black/50 p-2",
              alignEnd ? "right-0" : "left-0"
            )}
          >
            {showAi && (
              <div role="tablist" className="flex p-1 mb-2 rounded-xl bg-black/5 dark:bg-white/5">
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
                      "flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      tab === id ? "bg-white dark:bg-white/10 shadow-soft" : "opacity-50 hover:opacity-80"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <p className="px-2 pb-2 text-xs opacity-50">{activeTab === "ui" ? t("lang.uiHint") : t("lang.aiHint")}</p>

            <div className="relative mb-2">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("lang.search")}
                aria-label={t("lang.search")}
                className="w-full ps-9 pe-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 text-sm transition-colors"
              />
            </div>

            <div role="listbox" aria-label={t("lang.title")} className="max-h-72 overflow-y-auto">
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
                  secondary={l.name}
                  code={l.code}
                  dir="auto"
                />
              ))}
              {!showAuto && items.length === 0 && <div className="p-4 text-sm text-center opacity-50">{t("lang.empty")}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}