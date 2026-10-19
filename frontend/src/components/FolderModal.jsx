import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Folder, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const FOLDER_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#10b981", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#64748b", // Slate
];

export default function FolderModal({ open, onClose, folder, onSaved }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);
  const toast = useToast();


  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name || "");
        setColor(folder.color || "#6366f1");
      } else {
        setName("");
        setColor("#6366f1");
      }
    }
  }, [open, folder]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Vui lòng nhập tên thư mục.");
      return;
    }

    setLoading(true);
    try {
      if (folder) {
        // Cập nhật thư mục
        const res = await api.put(`/folders/${folder.id || folder._id}`, {
          name: name.trim(),
          color,
        });
        if (res.data.success) {
          toast.success("Đã cập nhật thư mục!");
          onSaved?.(res.data.data.folder);
          onClose();
        }
      } else {
        // Tạo thư mục mới
        const res = await api.post("/folders", {
          name: name.trim(),
          color,
          icon: "Folder",
        });
        if (res.data.success) {
          toast.success("Đã tạo thư mục mới!");
          onSaved?.(res.data.data.folder);
          onClose();
        }
      }
    } catch {
      toast.error("Không thể lưu thư mục.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: color }}
              >
                <Folder size={16} />
              </span>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                {folder ? t("folder.editFolder") : t("folder.newFolder")}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t("folder.name")}
              </label>
              <input
                type="text"
                autoFocus
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("folder.namePlaceholder")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                {t("folder.color")}
              </label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-transform",
                      color === c ? "scale-110 ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900" : "hover:scale-105"
                    )}
                  >
                    {color === c && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {t("folder.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {folder ? t("folder.save") : t("folder.create")}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
