import { useState, useEffect } from "react";
import { Megaphone, Info, AlertTriangle, CheckCircle2, Sparkles, X } from "lucide-react";
import api from "../api/axios.js";
import clsx from "clsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const TYPE_CONFIG = {
  info: {
    icon: Info,
    className: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
    iconColor: "text-amber-500",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200",
    iconColor: "text-emerald-500",
  },
  promo: {
    icon: Sparkles,
    className: "bg-purple-500/10 border-purple-500/20 text-purple-800 dark:text-purple-200",
    iconColor: "text-purple-500",
  },
};

export default function AnnouncementBanner() {
  const { t } = useI18n();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dismissed_announcements") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    api
      .get("/announcements/active")
      .then((res) => {
        if (isMounted && res.data.success) {
          setAnnouncements(res.data.data.announcements || []);
        }
      })
      .catch(() => {
        // Im lặng nếu không tải được thông báo
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("dismissed_announcements", JSON.stringify(updated));
    } catch {
      // bỏ qua lỗi storage
    }
  };

  const activeVisible = announcements.filter(
    (a) => !a.dismissible || !dismissedIds.includes(a.id)
  );

  if (activeVisible.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 px-4 pt-2 shrink-0">
      {activeVisible.map((item) => {
        const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
        const Icon = config.icon;

        return (
          <div
            key={item.id}
            className={clsx(
              "flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border text-xs shadow-2xs transition-all",
              config.className
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon size={16} className={clsx("shrink-0", config.iconColor)} />
              <div className="truncate">
                <strong className="font-semibold mr-1.5">{item.title}:</strong>
                <span className="opacity-90">{item.content}</span>
              </div>
            </div>

            {item.dismissible && (
              <button
                type="button"
                onClick={() => handleDismiss(item.id)}
                className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/5"
                title={t("announcements.closeTooltip") || "Đóng thông báo này"}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
