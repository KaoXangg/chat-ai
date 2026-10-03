import { useEffect, useRef, useState, useCallback } from "react";
import { Menu, ArrowDown, Download, Gauge } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import api from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import ChatInput from "../components/ChatInput.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import BrandMark from "../components/BrandMark.jsx";
import Tooltip from "../components/Tooltip.jsx";
import UsageModal, { usageTone, TEXT_TONE } from "../components/UsageModal.jsx";
import { useChatStream } from "../hooks/useChatStream.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { conversationToMarkdown, downloadTextFile, safeFileName } from "../utils/exportConversation.js";

const SUGGESTION_KEYS = ["chat.suggest1", "chat.suggest2", "chat.suggest3", "chat.suggest4"];

const SIDEBAR_KEY = "chat-sidebar-collapsed";
const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [draftModel, setDraftModel] = useState({ provider: "openrouter", model: "openrouter/free" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile: sidebar dạng drawer
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  }); // desktop: sidebar thu gọn hẳn
  const [searchTerm, setSearchTerm] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [usage, setUsage] = useState(null); // mức sử dụng token hôm nay (GET /usage)
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState(null);
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messageLoadVersionRef = useRef(0);
  const skipNextMessageLoadRef = useRef(new Set());
  const sendLockRef = useRef(false);
  const draftTouchedRef = useRef(false); // người dùng đã tự chọn model -> không ghi đè bằng model mặc định
  const { sendMessage, regenerate, editMessage, stop, isStreaming } = useChatStream();
  const { user } = useAuth();
  const { t, errorMessage, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();

  const activeConversation = conversations.find((c) => c._id === activeId);
  const currentSelection = activeConversation
    ? { provider: activeConversation.provider, model: activeConversation.model }
    : draftModel;
  const currentModel = models.find((m) => m.provider === currentSelection.provider && m.modelId === currentSelection.model);
  const currentUsage = usage?.models?.find((m) => m.provider === currentSelection.provider && m.modelId === currentSelection.model);
  const usageTonePill = usageTone(currentUsage?.percentRemaining);
  // Prefer the model's declared capability (admin-configurable); fall back to the historical
  // gemini-only behavior for models seeded before "vision" existed as a capability tag.
  const allowImage = Boolean(currentModel?.capabilities?.includes("vision") || currentSelection.provider === "gemini");

  const loadConversations = useCallback(
    async (search = "") => {
      try {
        const res = await api.get("/conversations", { params: { search } });
        setConversations(res.data.data.conversations);
        return res.data.data.conversations;
      } catch (err) {
        toast.error(errorMessage(err, "chat.err.loadConversations"));
        return [];
      }
    },
    [toast, errorMessage]
  );

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const res = await api.get("/usage");
      setUsage(res.data.data);
      setUsageError(null);
    } catch (err) {
      // Không chặn chat, nhưng cho người dùng biết lý do để dễ xử lý.
      const status = err.response?.status;
      if (status === 404) setUsageError(t("usage.err.notFound"));
      else if (!err.response) setUsageError(t("usage.err.network"));
      else setUsageError(t("usage.err.status", { status }));
    } finally {
      setUsageLoading(false);
    }
  }, [t]);

  const loadModels = useCallback(async () => {
    try {
      const res = await api.get("/models");
      const list = res.data.data.models;
      setModels(list);

      // Dùng model mặc định do admin đặt (isDefault), nếu chưa có thì lấy model khả dụng đầu tiên.
      if (!draftTouchedRef.current) {
        const preferred = list.find((m) => m.isDefault && m.available) || list.find((m) => m.available);
        if (preferred) setDraftModel({ provider: preferred.provider, model: preferred.modelId });
      }
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.loadModels"));
    }
  }, [toast, errorMessage]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, desktopCollapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [desktopCollapsed]);

  useEffect(() => {
    loadModels();
    loadConversations();
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    if (skipNextMessageLoadRef.current.delete(activeId)) return;

    const loadVersion = messageLoadVersionRef.current;
    let cancelled = false;
    setMessagesLoading(true);
    api
      .get(`/conversations/${activeId}/messages`)
      .then((res) => {
        if (!cancelled && loadVersion === messageLoadVersionRef.current) {
          setMessages(res.data.data.messages);
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err, "chat.err.loadMessages"));
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (activeConversation) {
      setDraftModel({ provider: activeConversation.provider, model: activeConversation.model });
    }
  }, [activeConversation?.provider, activeConversation?.model, activeId]);

  // Smart auto-scroll: only follow new content while the user is near the bottom.
  useEffect(() => {
    stickToBottomRef.current = true;
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (last?.role === "user") stickToBottomRef.current = true; // user just sent a message
    if (!stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming || isSubmitting ? "auto" : "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 120;
    setShowScrollBtn(distance > 240);
  };

  const scrollToBottom = () => {
    stickToBottomRef.current = true;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const handleNewConversation = async () => {
    try {
      const res = await api.post("/conversations", draftModel);
      const conv = res.data.data.conversation;
      skipNextMessageLoadRef.current.add(conv._id);
      setMessages([]);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv._id);
      setSidebarOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.create"));
    }
  };

  // Keyboard shortcuts: Ctrl/Cmd+K = search conversations, Ctrl/Cmd+Shift+O = new chat
  const newChatRef = useRef(handleNewConversation);
  newChatRef.current = handleNewConversation;
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.isComposing) return;
      const key = e.key.toLowerCase();
      if (key === "k" && !e.shiftKey) {
        e.preventDefault();
        if (isDesktop()) setDesktopCollapsed(false);
        else setSidebarOpen(true);
        setTimeout(() => document.getElementById("sidebar-search")?.focus({ preventScroll: true }), 60);
      } else if (key === "o" && e.shiftKey) {
        e.preventDefault();
        newChatRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleExport = () => {
    if (messages.length === 0) return;
    const title = activeConversation?.title || t("chat.exportDefaultTitle");
    const labels = {
      exportedAt: (time) => t("export.exportedAt", { time }),
      you: t("export.you"),
      ai: t("export.ai"),
      attachedImages: (n) => t("export.attachedImages", { n }),
    };
    downloadTextFile(`${safeFileName(title, t("chat.exportFileFallback"))}.md`, conversationToMarkdown(title, messages, labels, lang));
    toast.success(t("chat.exported"));
  };

  const ensureConversation = async () => {
    if (activeId) return activeId;
    const res = await api.post("/conversations", draftModel);
    const conv = res.data.data.conversation;
    skipNextMessageLoadRef.current.add(conv._id);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv._id);
    return conv._id;
  };

  const newTempKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /** Cập nhật một tin nhắn tạm theo clientKey (ổn định kể cả khi _id đổi từ id tạm sang id thật). */
  const patchMessage = (clientKey, update) => {
    setMessages((prev) => prev.map((m) => (m.clientKey === clientKey ? { ...m, ...update(m) } : m)));
  };

  /**
   * Bộ xử lý sự kiện stream cho một lượt trả lời.
   * - assistantKey / userKey: clientKey của tin nhắn tạm trong state.
   * - onPreStreamError: xử lý riêng khi lỗi xảy ra TRƯỚC khi máy chủ bắt đầu stream
   *   (mặc định hiện thẻ lỗi với nút "Thử lại" = tạo lại câu trả lời).
   */
  const buildHandlers = (assistantKey, { userKey, onPreStreamError } = {}) => ({
    onToken: (token) => patchMessage(assistantKey, (m) => ({ content: m.content + token })),
    onDone: (data) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientKey === assistantKey) {
            return { ...m, _id: data.messageId, provider: data.provider, model: data.model || m.model, sources: data.sources || null, error: null };
          }
          if (userKey && m.clientKey === userKey && data.userMessageId) return { ...m, _id: data.userMessageId };
          return m;
        })
      );
      loadConversations(searchTerm);
      loadUsage();
    },
    onError: (message, code, { preStream, userMessageId } = {}) => {
      if (code === "QUOTA_EXCEEDED" || !preStream) loadUsage();
      if (preStream && onPreStreamError) {
        onPreStreamError(message, code);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientKey === assistantKey) return { ...m, error: { message, code, retry: "regenerate" } };
          if (userKey && userMessageId && m.clientKey === userKey) return { ...m, _id: userMessageId };
          return m;
        })
      );
    },
  });

  const handleSend = async (content, options = {}) => {
    if (sendLockRef.current || isStreaming) return;
    sendLockRef.current = true;
    setIsSubmitting(true);
    messageLoadVersionRef.current += 1;

    const { images, useWebSearch } = options;
    const userKey = newTempKey("tmp-u");
    const assistantKey = newTempKey("tmp-a");
    setMessages((prev) => [
      ...prev,
      { _id: userKey, clientKey: userKey, role: "user", content, images: images?.length ? images : null },
      { _id: assistantKey, clientKey: assistantKey, role: "assistant", content: "" },
    ]);

    // Lỗi trước khi máy chủ lưu tin nhắn (rate limit, mất mạng, không tạo được cuộc trò chuyện...):
    // "Thử lại" phải GỬI LẠI tin nhắn chứ không phải tạo lại câu trả lời cũ.
    const showSendError = (message, code) =>
      patchMessage(assistantKey, () => ({ error: { message, code, retry: "send", payload: { content, options } } }));

    try {
      const convId = await ensureConversation();
      await sendMessage(convId, content, { images, useWebSearch }, buildHandlers(assistantKey, { userKey, onPreStreamError: showSendError }));
    } catch (err) {
      showSendError(errorMessage(err, "error.CONVERSATION_FAILED"), "CONVERSATION_FAILED");
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeId || isStreaming || isSubmitting) return;
    const assistantKey = newTempKey("tmp-a");
    setMessages((prev) => {
      const base = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
      return [...base, { _id: assistantKey, clientKey: assistantKey, role: "assistant", content: "" }];
    });

    try {
      await regenerate(activeId, buildHandlers(assistantKey));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.regenerate"));
    }
  };

  /** Sửa một tin nhắn đã gửi: cắt bỏ mọi tin phía sau nó rồi gửi lại (backend xóa tương ứng). */
  const handleEdit = async (messageId, newContent) => {
    const text = newContent.trim();
    if (!text || !activeId || sendLockRef.current || isStreaming) return;
    const index = messages.findIndex((m) => m._id === messageId && m.role === "user");
    if (index === -1) return;

    sendLockRef.current = true;
    setIsSubmitting(true);
    messageLoadVersionRef.current += 1;

    const snapshot = messages;
    const assistantKey = newTempKey("tmp-a");
    setMessages([
      ...messages.slice(0, index),
      { ...messages[index], content: text },
      { _id: assistantKey, clientKey: assistantKey, role: "assistant", content: "" },
    ]);

    // Máy chủ chưa thay đổi gì nếu lỗi xảy ra trước khi stream -> khôi phục lại danh sách tin nhắn cũ.
    const restore = (message) => {
      setMessages(snapshot);
      toast.error(message);
    };

    try {
      await editMessage(activeId, messageId, text, {}, buildHandlers(assistantKey, { onPreStreamError: restore }));
    } catch (err) {
      restore(errorMessage(err, "chat.err.edit"));
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  /** Nút "Thử lại" trên thẻ lỗi: gửi lại tin nhắn (nếu chưa được lưu) hoặc tạo lại câu trả lời. */
  const handleRetry = (message) => {
    const error = message?.error;
    if (!error || isStreaming || isSubmitting) return;
    if (error.retry === "send" && error.payload) {
      setMessages((prev) => prev.slice(0, -2)); // bỏ cặp tin nhắn tạm bị lỗi
      handleSend(error.payload.content, error.payload.options);
      return;
    }
    handleRegenerate();
  };

  const handleFeedback = async (messageId, feedback) => {
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, feedback } : m)));
    try {
      await api.patch(`/chat/message/${messageId}/feedback`, { feedback });
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.feedback"));
    }
  };

  const handleModelChange = async ({ provider, model }) => {
    const prevDraft = draftModel;
    draftTouchedRef.current = true;
    setDraftModel({ provider, model });
    if (!activeId) return;
    try {
      await api.patch(`/conversations/${activeId}`, { provider, model });
      setConversations((prev) => prev.map((c) => (c._id === activeId ? { ...c, provider, model } : c)));
    } catch (err) {
      setDraftModel(prevDraft);
      toast.error(errorMessage(err, "chat.err.changeModel"));
    }
  };

  const handleRename = async (id, title) => {
    try {
      await api.patch(`/conversations/${id}`, { title });
      setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title } : c)));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.rename"));
    }
  };

  const handlePin = async (id, pinned) => {
    try {
      await api.patch(`/conversations/${id}`, { pinned });
      await loadConversations(searchTerm);
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.pin"));
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: t("chat.deleteConfirm.title"),
      message: t("chat.deleteConfirm.message"),
      confirmLabel: t("chat.deleteConfirm.ok"),
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/conversations/${id}`);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);
      if (activeId === id) setActiveId(updated[0]?._id || null);
      toast.success(t("chat.deleted"));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.delete"));
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    loadConversations(term);
  };

  return (
    <div className="h-screen flex bg-surface-light dark:bg-surface-dark text-black dark:text-white relative overflow-hidden">
      <div className="aurora-bg" />
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={handleNewConversation}
        onSearch={handleSearch}
        onRename={handleRename}
        onPin={handlePin}
        onDelete={handleDelete}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        collapsed={desktopCollapsed}
        onCollapse={() => setDesktopCollapsed(true)}
        onExpand={() => setDesktopCollapsed(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="relative z-30 flex items-center justify-between px-4 py-3 border-b border-edge-light dark:border-edge-dark glass">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t("chat.openSidebar")}
            className="md:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <ModelSelector models={models} value={currentSelection} onChange={handleModelChange} />
          <div className="flex items-center gap-1">
          <Tooltip label={t("chat.usageTip")} align="end">
            <button
              onClick={() => {
                setUsageOpen(true);
                loadUsage();
              }}
              aria-label={t("chat.usageAria")}
              className="flex items-center gap-1.5 px-2 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Gauge size={18} />
              {currentUsage && !currentUsage.unlimited && (
                <span className={`text-xs font-semibold ${TEXT_TONE[usageTonePill]}`}>{currentUsage.percentRemaining}%</span>
              )}
            </button>
          </Tooltip>
          <Tooltip label={t("chat.exportTip")} align="end">
<button
            onClick={handleExport}
            disabled={messages.length === 0}
            aria-label={t("chat.exportAria")}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={18} />
          </button>
</Tooltip>
          </div>
        </header>

        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
            {messagesLoading ? (
              <div className="max-w-3xl mx-auto pb-4 pt-6 px-4 space-y-6 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={clsx("flex gap-3", i % 2 === 1 && "flex-row-reverse")}>
                    <div className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.08] shrink-0" />
                    <div className={clsx("h-16 rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]", i % 2 === 1 ? "w-2/5" : "w-3/5")} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-6">
                <BrandMark size={58} className="mb-4 drop-shadow-lg" />
                <p className="text-sm font-medium text-brand-600 dark:text-brand-300 mb-1">
                  {t("chat.hello", { name: user?.username || t("chat.friend") })}
                </p>
                <h2 className="font-display text-2xl font-semibold mb-1 tracking-tight">{t("chat.title")}</h2>
                <p className="text-sm opacity-50 mb-6">{t("chat.tagline")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {SUGGESTION_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSend(t(key))}
                      disabled={isStreaming || isSubmitting}
                      className="text-start text-sm px-4 py-3 rounded-2xl glass border border-edge-light dark:border-edge-dark hover:border-brand-400/60 hover:shadow-soft disabled:opacity-50 transition-all"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto pb-4">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.clientKey || m._id}
                    message={m}
                    isLast={i === messages.length - 1}
                    isStreaming={isStreaming || isSubmitting}
                    onRegenerate={handleRegenerate}
                    onFeedback={handleFeedback}
                    onEdit={handleEdit}
                    onRetry={handleRetry}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center z-20">
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  onClick={scrollToBottom}
                  aria-label={t("chat.scrollBottom")}
                  className="pointer-events-auto w-9 h-9 rounded-full glass border border-edge-light dark:border-edge-dark shadow-soft flex items-center justify-center hover:border-brand-400/60 transition-colors"
                >
                  <ArrowDown size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ChatInput onSend={handleSend} isStreaming={isStreaming} disabled={isSubmitting} onStop={stop} allowImage={allowImage} />
        <UsageModal
          open={usageOpen}
          onClose={() => setUsageOpen(false)}
          usage={usage}
          loading={usageLoading}
          error={usageError}
          onRefresh={loadUsage}
          current={currentSelection}
        />
      </div>
    </div>
  );
}