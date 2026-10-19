import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, MessageSquare, ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import api from "../api/axios.js";
import BrandMark from "../components/BrandMark.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function SharedChat() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/share/${shareId}`)
      .then((res) => {
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError("Không thể tải cuộc trò chuyện.");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || "Cuộc trò chuyện này không tồn tại hoặc đã bị tắt chia sẻ.");
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark gap-3">
        <BrandMark size={48} className="animate-pulse" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải cuộc trò chuyện...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Không tìm thấy cuộc trò chuyện</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">{error}</p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-md"
        >
          <ArrowLeft size={16} />
          Về trang trò chuyện
        </Link>
      </div>
    );
  }

  const { conversation, messages } = data;
  const createdDate = conversation?.createdAt
    ? new Date(conversation.createdAt).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark text-zinc-900 dark:text-zinc-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-edge-light dark:border-edge-dark print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/chat" className="flex items-center gap-2.5 shrink-0 group">
            <BrandMark size={32} />
            <span className="font-bold text-base tracking-tight hidden sm:inline">Chat AI</span>
          </Link>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate text-zinc-800 dark:text-zinc-200">
              {conversation.title}
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {createdDate} {conversation.model && `• ${conversation.model}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            title="In / Xuất PDF"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">In / Xuất PDF</span>
          </button>
          <ThemeToggle />
          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-sm"
          >
            <Sparkles size={13} />
            <span>Thử Chat AI</span>
          </Link>
        </div>
      </header>

      {/* Printable Header */}
      <div className="hidden print:block p-6 border-b border-zinc-200">
        <div className="flex items-center gap-3 mb-2">
          <BrandMark size={36} />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{conversation.title}</h1>
            <p className="text-xs text-zinc-500">{createdDate} • Mô hình: {conversation.model}</p>
          </div>
        </div>
      </div>

      {/* Messages List Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || index}
            message={message}
            isLast={index === messages.length - 1}
            isStreaming={false}
          />
        ))}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-edge-light dark:border-edge-dark print:hidden">
        Cuộc trò chuyện được chia sẻ công khai qua <Link to="/chat" className="text-brand-500 hover:underline">Chat AI</Link>
      </footer>
    </div>
  );
}
