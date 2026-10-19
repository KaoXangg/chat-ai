import { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Loader2, 
  Filter, 
  Clock, 
  User, 
  Eye, 
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import clsx from "clsx";

const ACTIONS = [
  { id: "", label: "Tất cả hành động", key: "audit.allActions" },
  { id: "SETTINGS_UPDATE", label: "Cập nhật Cài đặt" },
  { id: "USER_BAN", label: "Khóa Tài khoản" },
  { id: "USER_UNBAN", label: "Mở khóa Tài khoản" },
  { id: "USER_ROLE_CHANGE", label: "Đổi Quyền Hạn" },
  { id: "USER_QUOTA_UPDATE", label: "Cập nhật Hạn ngạch Quota" },
  { id: "USER_RESET_QUOTA", label: "Reset Quota Hôm nay" },
  { id: "PERSONA_CREATE", label: "Tạo Trợ lý AI" },
  { id: "PERSONA_UPDATE", label: "Sửa Trợ lý AI" },
  { id: "PERSONA_DELETE", label: "Xóa Trợ lý AI" },
];

export default function AuditLogs() {
  const { t, language } = useI18n();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const [activeLog, setActiveLog] = useState(null);

  const loadLogs = async (p = page, action = selectedAction, search = searchTerm) => {
    try {
      setLoading(true);
      const res = await api.get("/admin/audit-logs", {
        params: { page: p, limit, action: action || undefined, search: search || undefined },
      });
      if (res.data.success) {
        setLogs(res.data.data.logs || []);
        setTotal(res.data.data.total || 0);
      }
    } catch {
      toast.error("Không thể tải nhật ký hoạt động.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page, selectedAction, searchTerm);
  }, [page, selectedAction]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1, selectedAction, searchTerm);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const formatActionBadge = (action) => {
    if (action?.includes("BAN")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    if (action?.includes("CREATE")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (action?.includes("SETTINGS")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20";
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <History className="text-brand-500" size={26} />
          {t("audit.title")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {t("audit.subtitle")}
        </p>
      </div>

      {/* Tìm kiếm & Bộ lọc */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("audit.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-zinc-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
          >
            {ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.key ? t(a.key) : a.label}</option>
            ))}
          </select>
        </div>
      </form>

      {/* Bảng Danh sách Logs */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[35vh]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            {t("audit.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{t("audit.colTime")}</th>
                  <th className="py-3 px-4">{t("audit.colAdmin")}</th>
                  <th className="py-3 px-4">{t("audit.colAction")}</th>
                  <th className="py-3 px-4">{t("audit.colTarget")}</th>
                  <th className="py-3 px-4">{t("audit.colDetails")}</th>
                  <th className="py-3 px-4 text-end">{t("audit.colView")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-500">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock size={12} className="opacity-60" />
                        <span>{new Date(log.createdAt).toLocaleString(language === "vi" ? "vi-VN" : language === "ja" ? "ja-JP" : language === "zh-CN" ? "zh-CN" : "en-US")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-zinc-400" />
                        <span>{log.adminUsername || t("audit.systemAdmin")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-mono border", formatActionBadge(log.action))}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {log.targetType ? `${log.targetType} (#${log.targetId || ""})` : "-"}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-zinc-500 font-mono text-[11px]">
                      {log.details || "-"}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={() => setActiveLog(log)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        title={t("audit.viewTooltip")}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{t("audit.totalLogs", { n: total }).replace("{n}", total)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span>{t("audit.page", { p: page, t: totalPages }).replace("{p}", page).replace("{t}", totalPages)}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>


      {/* Modal chi tiết Log */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {t("audit.modalTitle", { id: activeLog.id }).replace("#{id}", `#${activeLog.id}`)}
              </h2>
              <button
                onClick={() => setActiveLog(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60">
                <div>
                  <span className="text-zinc-400">{t("audit.colTime")}:</span>
                  <p className="font-medium">{new Date(activeLog.createdAt).toLocaleString(language === "vi" ? "vi-VN" : language === "ja" ? "ja-JP" : language === "zh-CN" ? "zh-CN" : "en-US")}</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("audit.colAdmin")}:</span>
                  <p className="font-medium">{activeLog.adminUsername || t("audit.systemAdmin")} (ID #{activeLog.adminId})</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("audit.colAction")}:</span>
                  <p className="font-mono text-brand-600 dark:text-brand-400">{activeLog.action}</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("audit.ipClient")}</span>
                  <p className="font-mono">{activeLog.ipAddress || "N/A"}</p>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block mb-1">{t("audit.payloadTitle")}</span>
                <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeLog.details), null, 2);
                    } catch {
                      return activeLog.details || t("audit.noData");
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium"
              >
                {t("audit.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
