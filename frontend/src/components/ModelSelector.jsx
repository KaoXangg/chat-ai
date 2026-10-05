import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles, CircleSlash, Image as ImageIcon } from "lucide-react";
import Tooltip from "./Tooltip.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function ModelSelector({ models, value, onChange }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = models.find((m) => m.provider === value?.provider && m.modelId === value?.model);

  const grouped = models.reduce((acc, m) => {
    acc[m.provider] = acc[m.provider] || [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1.5" onKeyDown={(e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
      if (!open || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const options = Array.from(ref.current?.querySelectorAll('[role="option"]:not([disabled])') || []);
      if (!options.length) return;
      e.preventDefault();
      const index = options.indexOf(document.activeElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : e.key === "ArrowDown" ? (index + 1) % options.length : index < 0 ? options.length - 1 : (index - 1 + options.length) % options.length;
      options[next]?.focus();
    }}>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t("model.select")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium glass border transition-colors ${
            open ? "border-brand-400/70" : "border-edge-light dark:border-edge-dark"
          }`}
        >
          <Sparkles size={15} className="text-brand-500" />
          <span>{current?.displayName || t("model.choose")}</span>
          <ChevronDown size={14} className={`opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="listbox"
              aria-label={t("model.select")}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-96 overflow-y-auto rounded-2xl border border-edge-light dark:border-edge-dark bg-white dark:bg-[#14141f] shadow-2xl shadow-black/15 dark:shadow-black/50 p-2"
            >
              {Object.entries(grouped).map(([provider, list]) => (
                <div key={provider} className="mb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-black/40 dark:text-white/40 capitalize">{provider}</div>
                  {list.map((m) => (
                    <button
                      key={m._id}
                      disabled={!m.available}
                      role="option"
                      aria-selected={current?._id === m._id}
                      aria-label={`${m.displayName}${m.available ? "" : ` (${t("model.noKeyShort")})`}`}
                      onClick={() => {
                        onChange({ provider: m.provider, model: m.modelId });
                        setOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-xl flex items-start gap-2 transition-colors ${
                        m.available ? "hover:bg-brand-500/10" : "opacity-40 cursor-not-allowed"
                      } ${current?._id === m._id ? "bg-brand-500/10" : ""}`}
                    >
                      {m.available ? (
                        <Sparkles size={14} className="mt-0.5 text-brand-500 shrink-0" />
                      ) : (
                        <CircleSlash size={14} className="mt-0.5 text-red-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{m.displayName}</span>
                          {m.capabilities?.includes("vision") && (
                            <Tooltip label={t("model.visionTip")} side="top">
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-ion-500/10 text-ion-600 dark:text-ion-400">
                                <ImageIcon size={9} /> {t("model.vision")}
                              </span>
                            </Tooltip>
                          )}
                        </div>
                        <div className="text-xs text-black/60 dark:text-white/60">
                          {m.available ? m.description : t("model.noKey")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {models.length === 0 && <div className="p-3 text-sm text-center opacity-60">{t("model.none")}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ngôn ngữ giao diện + ngôn ngữ AI trả lời, đặt cạnh lựa chọn mô hình. */}
      <LanguageSwitcher mode="full" />
    </div>
  );
}
