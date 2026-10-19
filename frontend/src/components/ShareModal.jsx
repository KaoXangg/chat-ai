import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Share2, Copy, Check, ExternalLink, ShieldAlert, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ShareModal({ open, onClose, conversation }) {
  const [shareId, setShareId] = useState(conversation?.shareId || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open && conversation) {
      setShareId(conversation.shareId || null);
      // Fetch fresh share state
      api
        .get(`/conversations/${conversation.id || conversation._id}/share`)
        .then((res) => {
          if (res.data.success && res.data.data.shareId) {
            setShareId(res.data.data.shareId);
          }
        })
        .catch(() => {});
    }
  }, [open, conversation]);

  if (!open || !conversation) return null;

  const convId = conversation.id || conversation._id;
  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/conversations/${convId}/share`);
      if (res.data.success) {
        setShareId(res.data.data.shareId);
        toast.success("Đã tạo liên kết chia sẻ!");
      }
    } catch {
      toast.error("Không thể tạo liên kết chia sẻ.");
    } finally {
      setLoading(false);
    }
  };

  const handleStopShare = async () => {
    setLoading(true);
    try {
      const res = await api.delete(`/conversations/${convId}/share`);
      if (res.data.success) {
        setShareId(null);
        toast.success("Đã tắt chia sẻ liên kết.");
      }
    } catch {
      toast.error("Không thể tắt chia sẻ.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Đã sao chép liên kết vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.25 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Chia sẻ cuộc trò chuyện
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[280px]">
                  {conversation.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Bất kỳ ai có đường liên kết này đều có thể xem toàn bộ tin nhắn của cuộc trò chuyện mà không cần đăng nhập.
          </div>

          {shareId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-200 outline-none px-2 select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors shrink-0 shadow-sm"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Đã chép" : "Sao chép"}</span>
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
                  title="Mở liên kết"
                >
                  <ExternalLink size={15} />
                </a>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleStopShare}
                  disabled={loading}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium flex items-center gap-1.5"
                >
                  <ShieldAlert size={14} />
                  Dừng chia sẻ liên kết này
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                Tạo liên kết chia sẻ công khai
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
