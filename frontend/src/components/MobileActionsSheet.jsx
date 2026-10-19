import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Share2, Printer, Download, Sparkles, Moon, Sun, Globe } from "lucide-react";
import ThemeToggle from "./ThemeToggle.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function MobileActionsSheet({
  open,
  onClose,
  onShare,
  onPrint,
  onExport,
  canShare,
  canExport,
}) {
  const { t } = useI18n();
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("chat.moreActions")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl bg-white dark:bg-[#12121a] text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-zinc-800 p-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-1" aria-hidden="true" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                {t("chat.moreActions")}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Theme & Language Controls */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Sun size={15} className="text-amber-500" />
                  {t("chat.themeToggle")}
                </span>
                <ThemeToggle variant="compact" />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Globe size={15} className="text-brand-500" />
                  Ngôn ngữ
                </span>
                <LanguageSwitcher mode="full" align="end" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                disabled={!canShare}
                onClick={() => {
                  onClose();
                  onShare();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 disabled:opacity-35 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              >
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Share2 size={16} />
                </div>
                <div className="text-start">
                  <div className="text-sm font-medium">{t("chat.shareTip")}</div>
                </div>
              </button>

              <button
                type="button"
                disabled={!canExport}
                onClick={() => {
                  onClose();
                  onPrint();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 disabled:opacity-35 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Printer size={16} />
                </div>
                <div className="text-start">
                  <div className="text-sm font-medium">{t("chat.printTip")}</div>
                </div>
              </button>

              <button
                type="button"
                disabled={!canExport}
                onClick={() => {
                  onClose();
                  onExport();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 disabled:opacity-35 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Download size={16} />
                </div>
                <div className="text-start">
                  <div className="text-sm font-medium">{t("chat.exportTip")}</div>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
