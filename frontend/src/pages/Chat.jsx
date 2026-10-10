import { useEffect, useRef, useState, useCallback } from "react";
import { Menu, ArrowDown, ArrowUpRight, Download, Gauge } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import api from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import ChatInput from "../components/ChatInput.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import BrandMark from "../components/BrandMark.jsx";
import Tooltip from "../components/Tooltip.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
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
  const conversationLoadVersionRef = useRef(0);
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
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
  // Attachments follow the selected model's declared capability.
  const allowImage = Boolean(currentModel?.capabilities?.includes("vision"));
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(
    async (search = searchTermRef.current) => {
      const version = ++conversationLoadVersionRef.current;
      try {
        const res = await api.get("/conversations", { params: { search } });
        if (version === conversationLoadVersionRef.current) setConversations(res.data.data.conversations);
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
      setMessagesLoading(false);
      return;
    }

    if (skipNextMessageLoadRef.current.delete(activeId)) { setMessagesLoading(false); return; }

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
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setIsSubmitting(true);
    const previousId = activeIdRef.current;
    try {
      const res = await api.post("/conversations", draftModel);
      const conv = res.data.data.conversation;
      setConversations((prev) => [conv, ...prev]);
      if (activeIdRef.current !== previousId) return;
      messageLoadVersionRef.current += 1;
      skipNextMessageLoadRef.current.add(conv._id);
      setMessages([]);
      activeIdRef.current = conv._id;
      setActiveId(conv._id);
      setSidebarOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.create"));
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
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
    activeIdRef.current = conv._id;
    setActiveId(conv._id);
    return conv._id;
  };

  const newTempKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /** Cập nhật một tin nhắn tạm theo clientKey (ổn định kể cả khi _id đổi từ id tạm sang id thật). */
  const patchMessage = (clientKey, update) => {
    setMessages((prev) => prev.map((m) => (m.clientKey === clientKey ? { ...m, ...update(m) } : m)));
  };

  const refreshMessages = async (conversationId) => {
    const version = messageLoadVersionRef.current;
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      if (activeIdRef.current === conversationId && version === messageLoadVersionRef.current) setMessages(res.data.data.messages);
    } catch (err) { toast.error(errorMessage(err, "chat.err.loadMessages")); }
  };

  /**
   * Bộ xử lý sự kiện stream cho một lượt trả lời.
   * - assistantKey / userKey: clientKey của tin nhắn tạm trong state.
   * - onPreStreamError: xử lý riêng khi lỗi xảy ra TRƯỚC khi máy chủ bắt đầu stream
   *   (mặc định hiện thẻ lỗi với nút "Thử lại" = tạo lại câu trả lời).
   */
  const buildHandlers = (assistantKey, { conversationId, userKey, onPreStreamError, replacedClientKey } = {}) => ({
    onStart: (data) => {
      if (activeIdRef.current !== conversationId) return;
      if (userKey && data.userMessageId) patchMessage(userKey, () => ({ _id: data.userMessageId }));
    },
    onStop: () => {
      if (activeIdRef.current === conversationId) setMessages((prev) => prev
        .filter((m) => m.clientKey !== assistantKey || m.content)
        .map((m) => m.clientKey === assistantKey ? { ...m, interrupted: true } : m));
      loadUsage();
    },
    onToken: (token) => { if (activeIdRef.current === conversationId) patchMessage(assistantKey, (m) => ({ content: m.content + token })); },
    onDone: (data) => {
      if (activeIdRef.current === conversationId && !messagesRef.current.some(m => m.clientKey === assistantKey)) refreshMessages(conversationId);
      if (activeIdRef.current === conversationId) setMessages((prev) =>
        prev.filter((m) => (!data.replacedMessageId || m._id !== data.replacedMessageId)
          && !(data.replacedAfterId != null && m.role === "assistant" && Number(m._id) > data.replacedAfterId && Number(m._id) <= Number(data.replacedMessageId))
          && (!replacedClientKey || (m.clientKey || m._id) !== replacedClientKey)).map((m) => {
          if (m.clientKey === assistantKey) {
            return { ...m, _id: data.messageId, provider: data.provider, model: data.model || m.model, sources: data.sources || null, error: null };
          }
          if (userKey && m.clientKey === userKey && data.userMessageId) return { ...m, _id: data.userMessageId };
          return m;
        })
      );
      loadConversations();
      loadUsage();
    },
    onError: (message, code, metadata = {}) => {
      const { preStream, userMessageId, messageId, interrupted } = metadata;
      if (code === "QUOTA_EXCEEDED" || !preStream) loadUsage();
      if (activeIdRef.current !== conversationId) return;
      if (preStream && onPreStreamError) {
        onPreStreamError(message, code, metadata);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientKey === assistantKey) return { ...m, _id: messageId || m._id, interrupted, error: { message, code, retry: "regenerate" } };
          if (userKey && userMessageId && m.clientKey === userKey) return { ...m, _id: userMessageId };
          return m;
        })
      );
    },
  });

  const handleSend = async (content, options = {}) => {
    if (sendLockRef.current || isStreaming || messagesLoading) return;
    sendLockRef.current = true;
    setIsSubmitting(true);
    messageLoadVersionRef.current += 1;

    const { images } = options;
    const requestId = options.requestId || crypto.randomUUID();
    const retryOptions = { ...options, requestId };
    const userKey = newTempKey("tmp-u");
    const assistantKey = newTempKey("tmp-a");
    setMessages((prev) => [
      ...prev,
      { _id: userKey, clientKey: userKey, requestId, role: "user", content, images: images?.length ? images : null },
      { _id: assistantKey, clientKey: assistantKey, role: "assistant", content: "" },
    ]);

    // Khi chưa nhận xác nhận lưu, gửi lại cùng requestId để tránh tạo trùng nếu phản hồi bị mất.
    const showSendError = (message, code) =>
      patchMessage(assistantKey, () => ({ error: { message, code, retry: "send", payload: { content, options: retryOptions } } }));

    try {
      const convId = await ensureConversation();
      await sendMessage(convId, content, retryOptions, buildHandlers(assistantKey, { conversationId: convId, userKey, onPreStreamError: async (message, code) => {
        if (code === "REQUEST_ALREADY_PROCESSED") { await refreshMessages(convId); toast.error(message); }
        else showSendError(message, code);
      } }));
    } catch (err) {
      showSendError(errorMessage(err, "error.CONVERSATION_FAILED"), "CONVERSATION_FAILED");
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeId || sendLockRef.current || isStreaming || isSubmitting || messagesLoading) return;
    sendLockRef.current = true;
    setIsSubmitting(true);
    messageLoadVersionRef.current += 1;
    const assistantKey = newTempKey("tmp-a");
    const previous = messages[messages.length - 1];
    const replacedClientKey = previous?.role === "assistant" ? (previous.clientKey || previous._id) : null;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const base = last?.role === "assistant" && !last.content && String(last._id).startsWith("tmp-") ? prev.slice(0, -1) : prev;
      return [...base, { _id: assistantKey, clientKey: assistantKey, role: "assistant", content: "" }];
    });

    try {
      await regenerate(activeId, buildHandlers(assistantKey, { conversationId: activeId, replacedClientKey }));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.regenerate"));
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  /** Sửa một tin nhắn đã gửi: cắt bỏ mọi tin phía sau nó rồi gửi lại (backend xóa tương ứng). */
  const handleEdit = async (messageId, newContent) => {
    const text = newContent.trim();
    if (!text || !activeId || sendLockRef.current || isStreaming || messagesLoading) return;
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

    const conversationId = activeId;
    const editVersion = messageLoadVersionRef.current;
    // A network failure can lose the acknowledgement after the edit has committed.
    const restore = async (message, _code, { uncertain } = {}) => {
      if (uncertain) {
        try {
          const res = await api.get(`/conversations/${conversationId}/messages`);
          if (activeIdRef.current === conversationId && editVersion === messageLoadVersionRef.current) setMessages(res.data.data.messages);
        } catch {
          // Keep the edited view when the server state cannot yet be confirmed.
        }
      } else if (activeIdRef.current === conversationId && editVersion === messageLoadVersionRef.current) setMessages(snapshot);
      toast.error(message);
    };

    try {
      await editMessage(activeId, messageId, text, {}, buildHandlers(assistantKey, { conversationId: activeId, onPreStreamError: restore }));
    } catch (err) {
      restore(errorMessage(err, "chat.err.edit"));
    } finally {
      sendLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  /** Gửi lại cùng requestId khi chưa nhận xác nhận, hoặc tạo lại câu trả lời đã bắt đầu. */
  const handleRetry = (message) => {
    const error = message?.error;
    if (!error || isStreaming || isSubmitting || messagesLoading) return;
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
      await loadConversations();
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
      const updated = conversationsRef.current.filter((c) => c._id !== id);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeIdRef.current === id) {
        const nextId = updated[0]?._id || null;
        activeIdRef.current = nextId;
        messageLoadVersionRef.current += 1;
        setMessages([]);
        setMessagesLoading(Boolean(nextId));
        setActiveId(nextId);
      }
      toast.success(t("chat.deleted"));
    } catch (err) {
      toast.error(errorMessage(err, "chat.err.delete"));
    }
  };

  const handleSearch = (term) => {
    searchTermRef.current = term;
    setSearchTerm(term);
    loadConversations(term);
  };

  return (
    <div className="workspace-ui chat-shell relative">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          if (sendLockRef.current && !activeIdRef.current) return;
          if (activeIdRef.current !== id) {
            activeIdRef.current = id;
            messageLoadVersionRef.current += 1;
            setMessages([]);
            setMessagesLoading(true);
          }
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

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10" inert={sidebarOpen && !isDesktop() ? "" : undefined}>
        <header className="chat-header relative z-30 flex items-center justify-between border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t("chat.openSidebar")}
            aria-expanded={sidebarOpen}
            aria-controls="chat-navigation"
            className="workspace-icon-button md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="chat-header-model"><ModelSelector models={models} value={currentSelection} onChange={handleModelChange} /></div>
          <div className="chat-header-actions flex items-center gap-1">
          <ThemeToggle className="me-1" />
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
              <div className="chat-welcome">
                <BrandMark size={44} className="mb-5" />
                <p className="text-sm font-medium text-brand-600 dark:text-brand-300 mb-1">
                  {t("chat.hello", { name: user?.username || t("chat.friend") })}
                </p>
                <h2 className="font-display text-2xl font-semibold mb-1 tracking-tight">{t("chat.title")}</h2>
                <p className="text-sm workspace-muted mt-2 mb-7 max-w-md leading-relaxed">{t("chat.tagline")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                  {SUGGESTION_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSend(t(key))}
                      disabled={isStreaming || isSubmitting}
                      className="chat-suggestion"
                    >
                      <span>{t(key)}</span><ArrowUpRight size={16} className="shrink-0 workspace-muted" />
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

        <ChatInput key={activeId || "draft"} onSend={handleSend} isStreaming={isStreaming} disabled={isSubmitting || messagesLoading} onStop={stop} allowImage={allowImage} />
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
