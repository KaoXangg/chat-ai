import { useCallback, useEffect, useState } from "react";
import { MessagesSquare, Trash2, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import api from "../../api/axios.js";
import { TableRowSkeleton, CardRowSkeleton } from "../../components/Skeleton.jsx";
import { useToast, apiErrorMessage } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";

const PAGE_SIZE = 15;

export default function AdminConversations() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/conversations", { params: { page, limit: PAGE_SIZE } });
      setConversations(res.data.data.conversations);
      setTotal(res.data.data.total);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không thể tải danh sách cuộc trò chuyện."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (conv) => {
    const ok = await confirm({
      title: "Xóa cuộc trò chuyện?",
      message: `Xóa cuộc trò chuyện "${conv.title}" của ${conv.user?.username || "người dùng đã xóa"}? Toàn bộ tin nhắn liên quan sẽ bị xóa vĩnh viễn.`,
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/conversations/${conv._id}`);
      setConversations((prev) => prev.filter((c) => c._id !== conv._id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Đã xóa cuộc trò chuyện.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không thể xóa cuộc trò chuyện."));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Cuộc trò chuyện</h1>
          <p className="text-sm opacity-50">Xem và kiểm duyệt toàn bộ cuộc trò chuyện của người dùng trên hệ thống</p>
        </div>
        <span className="text-xs opacity-50 shrink-0">{total} cuộc trò chuyện</span>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <CardRowSkeleton key={i} />)}
        {!loading &&
          conversations.map((c) => (
            <div key={c._id} className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 space-y-2 shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate flex items-center gap-1.5">
                  {c.pinned && <Pin size={12} className="opacity-50 shrink-0" />}
                  {c.title === "Cuoc tro chuyen moi" ? "Cuộc trò chuyện mới" : c.title}
                </p>
                <button onClick={() => remove(c)} aria-label="Xóa cuộc trò chuyện" className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs opacity-60 truncate">{c.user?.username || "—"} · {c.user?.email || ""}</p>
              <div className="flex items-center justify-between text-xs opacity-50">
                <span className="capitalize">{c.provider} / {c.model}</span>
                <span>{new Date(c.updatedAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          ))}
        {!loading && conversations.length === 0 && <p className="text-center text-sm opacity-40 py-8">Chưa có cuộc trò chuyện nào</p>}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden sm:block rounded-2xl glass border border-edge-light dark:border-edge-dark overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tiêu đề</th>
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Mô hình</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
                <th className="px-4 py-3 font-medium text-right">Hành động</th>
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
                        {c.title === "Cuoc tro chuyen moi" ? "Cuộc trò chuyện mới" : c.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-70 max-w-[200px] truncate">{c.user?.username || "—"} <span className="opacity-50">· {c.user?.email}</span></td>
                    <td className="px-4 py-3 opacity-70 capitalize">{c.provider} / {c.model}</td>
                    <td className="px-4 py-3 opacity-50">{new Date(c.updatedAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(c)} aria-label="Xóa cuộc trò chuyện" className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
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
            Chưa có cuộc trò chuyện nào
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Trang trước"
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm opacity-60">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Trang sau"
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
