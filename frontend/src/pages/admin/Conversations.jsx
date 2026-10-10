import { useCallback, useEffect, useState, useRef } from "react";
import { MessagesSquare, Trash2, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import api from "../../api/axios.js";
import { TableRowSkeleton, CardRowSkeleton } from "../../components/Skeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const PAGE_SIZE = 15;

// Tiêu đề mặc định do server tạo (có/không dấu) -> hiển thị theo ngôn ngữ giao diện.
const isDefaultTitle = (title) => title === "Cuoc tro chuyen moi" || title === "Cuộc trò chuyện mới";

export default function AdminConversations() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const loadVersionRef = useRef(0);
  const toast = useToast();
  const confirm = useConfirm();
  const { t, lang, errorMessage } = useI18n();

  const load = useCallback(async () => {
    const version = ++loadVersionRef.current;
    setLoading(true);
    try {
      const res = await api.get("/admin/conversations", { params: { page, limit: PAGE_SIZE } });
      if (version !== loadVersionRef.current) return;
      const lastPage = Math.max(1, Math.ceil(res.data.data.total / PAGE_SIZE));
      setPage((current) => Math.min(current, lastPage));
      setConversations(res.data.data.conversations);
      setTotal(res.data.data.total);
    } catch (err) {
      if (version === loadVersionRef.current) toast.error(errorMessage(err, "chat.err.loadConversations"));
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refresh]);

  useEffect(() => {
    load();
    return () => { loadVersionRef.current += 1; };
  }, [load]);

  const remove = async (conv) => {
    const ok = await confirm({
      title: t("chat.deleteConfirm.title"),
      message: t("admin.conv.deleteMessage", { title: conv.title, user: conv.user?.username || t("admin.conv.deletedUser") }),
      confirmLabel: t("chat.deleteConfirm.ok"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/conversations/${conv._id}`);
      setRefresh((value) => value + 1);
      toast.success(t("chat.deleted"));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.delete"));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-page space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-page-heading">
          <h1 className="font-display text-xl font-semibold tracking-tight">{t("admin.conv.title")}</h1>
          <p className="text-sm opacity-50">{t("admin.conv.subtitle")}</p>
        </div>
        <span className="text-xs opacity-50 shrink-0">{t("admin.conv.count", { n: total })}</span>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <CardRowSkeleton key={i} />)}
        {!loading &&
          conversations.map((c) => (
            <div key={c._id} className="admin-data-panel p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium min-w-0 flex items-center gap-1.5">
                  {c.pinned && <Pin size={12} className="opacity-50 shrink-0" />}
                  <span className="truncate">{isDefaultTitle(c.title) ? t("sidebar.newChat") : c.title}</span>
                </p>
                <button onClick={() => remove(c)} aria-label={t("sidebar.delete")} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs opacity-60 truncate">{c.user?.username || "—"} · {c.user?.email || ""}</p>
              <div className="flex items-center justify-between gap-3 text-xs workspace-muted">
                <span className="capitalize min-w-0 break-all">{c.provider} / {c.model}</span>
                <span className="shrink-0">{new Date(c.updatedAt).toLocaleDateString(lang)}</span>
              </div>
            </div>
          ))}
        {!loading && conversations.length === 0 && <p className="text-center text-sm opacity-40 py-8">{t("admin.conv.empty")}</p>}
      </div>

      {/* Desktop / tablet: table */}
      <div className="admin-data-panel hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 text-start">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin.conv.colTitle")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.conv.colUser")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.conv.colModel")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.conv.colUpdated")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("admin.conv.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: PAGE_SIZE }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
              {!loading &&
                conversations.map((c) => (
                  <tr key={c._id} className="border-t border-edge-light dark:border-edge-dark hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate">
                      <span className="flex items-center gap-1.5">
                        {c.pinned && <Pin size={12} className="opacity-50 shrink-0" />}
                        {isDefaultTitle(c.title) ? t("sidebar.newChat") : c.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-70 max-w-[200px] truncate">{c.user?.username || "—"} <span className="opacity-50">· {c.user?.email}</span></td>
                    <td className="px-4 py-3 opacity-70 capitalize">{c.provider} / {c.model}</td>
                    <td className="px-4 py-3 opacity-50">{new Date(c.updatedAt).toLocaleDateString(lang)}</td>
                    <td className="px-4 py-3 text-end">
                      <button onClick={() => remove(c)} aria-label={t("sidebar.delete")} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!loading && conversations.length === 0 && (
          <div className="py-10 text-center text-sm opacity-40 flex flex-col items-center gap-2">
            <MessagesSquare size={22} className="opacity-40" />
            {t("admin.conv.empty")}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label={t("admin.page.prev")}
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm opacity-60">
            {t("admin.page.of", { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label={t("admin.page.next")}
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
