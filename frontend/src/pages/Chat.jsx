import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, ArrowDown, ArrowUpRight, Download, FileJson, Gauge, Share2, Printer, Bot, AlertTriangle, ShieldAlert, MoreHorizontal, Search, Code2, PenTool, BarChart3, GraduationCap, Sparkles, Scale, Bookmark, ChevronDown, Trash2 } from "lucide-react";
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
import ShareModal from "../components/ShareModal.jsx";
import PersonasModal from "../components/PersonasModal.jsx";
import ProfileModal from "../components/ProfileModal.jsx";
import CommandPalette from "../components/CommandPalette.jsx";
import ModelArenaModal from "../components/ModelArenaModal.jsx";
import ArtifactSidePanel from "../components/ArtifactSidePanel.jsx";
import CodePreviewModal from "../components/CodePreviewModal.jsx";
import AnnouncementBanner from "../components/AnnouncementBanner.jsx";
import MobileActionsSheet from "../components/MobileActionsSheet.jsx";
import { getLocalizedPersona } from "../utils/personaHelper.js";
import { useChatStream } from "../hooks/useChatStream.js";

import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { conversationToMarkdown, conversationToJson, downloadTextFile, safeFileName } from "../utils/exportConversation.js";

const SUGGESTION_KEYS = ["chat.suggest1", "chat.suggest2", "chat.suggest3", "chat.suggest4"];

const PROMPT_CATEGORIES = [
  { id: "default", label: "Đề xuất", icon: Sparkles },
  {
    id: "code",
    label: "Lập trình & Debug",
    icon: Code2,
    prompts: [
      "Thiết kế kiến trúc REST API chuẩn bảo mật với Node.js, Express và JWT Refresh Token",
      "Viết trang Dashboard hiện đại bằng HTML & Tailwind CSS để xem trực tiếp trên Artifact Canvas",
      "Giải thích và vẽ sơ đồ Mermaid luồng xác thực OAuth 2.0 / OpenID Connect",
      "Tối ưu câu truy vấn SQL Server bị chậm khi phân trang trên bảng dữ liệu hàng triệu bản ghi",
    ],
  },
  {
    id: "writing",
    label: "Viết lách & Dịch thuật",
    icon: PenTool,
    prompts: [
      "Soạn email chuyên nghiệp bằng tiếng Anh và tiếng Việt để đề xuất lộ trình nâng cấp dự án",
      "Viết tài liệu README.md chuẩn mã nguồn mở chuyên nghiệp cho dự án Full-Stack AI",
      "Chuyển đổi đoạn văn bản kỹ thuật sang giọng điệu súc tích, thuyết phục dành cho lãnh đạo",
      "Tạo kịch bản thuyết trình 5 phút ấn tượng để bảo vệ đồ án công nghệ thông tin",
    ],
  },
  {
    id: "data",
    label: "Phân tích dữ liệu",
    icon: BarChart3,
    prompts: [
      "Lập bảng so sánh chi tiết hiệu năng, chi phí và ngữ cảnh giữa Llama 3.3, Gemini 2.5 và GPT-4o",
      "Phân tích các chỉ số KPI quan trọng nhất cho một sản phẩm SaaS AI theo mô hình Freemium",
      "Viết script Python đọc file CSV, làm sạch dữ liệu thiếu và xuất báo cáo thống kê tổng hợp",
      "Thiết kế lược đồ cơ sở dữ liệu (ERD bằng Mermaid) cho hệ thống thương mại điện tử đa kho",
    ],
  },
  {
    id: "study",
    label: "Học tập & Tóm tắt",
    icon: GraduationCap,
    prompts: [
      "Giải thích cơ chế Attention và kiến trúc Transformer dễ hiểu kèm ví dụ minh họa trực quan",
      "Tổng hợp lộ trình ôn tập Cấu trúc dữ liệu & Giải thuật trong 14 ngày kèm bài tập trọng tâm",
      "Phân biệt chi tiết Concurrency và Parallelism trong hệ điều hành với ví dụ thực tế",
      "Hướng dẫn phương pháp đọc nhanh và tóm tắt tài liệu nghiên cứu khoa học (Paper/PDF)",
    ],
  },
];

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
  const [shareOpen, setShareOpen] = useState(false);
  const [personasOpen, setPersonasOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatai_bookmarks_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeArtifact, setActiveArtifact] = useState(null); // { code, language } cho Side-Panel
  const [expandedArtifactModal, setExpandedArtifactModal] = useState(null); // { code, language } cho Full Modal
  const [promptCategory, setPromptCategory] = useState("default");
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState(null);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [activePersona, setActivePersona] = useState(null);
  const [targetMessageId, setTargetMessageId] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState(null);
  const [restoredText, setRestoredText] = useState("");
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
  const navigate = useNavigate();

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

    const onQuotaUpdate = () => loadUsage();
    window.addEventListener("quota-updated", onQuotaUpdate);
    return () => window.removeEventListener("quota-updated", onQuotaUpdate);
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

  // Cuộn và highlight tin nhắn khi chọn từ kết quả tìm kiếm sâu
  useEffect(() => {
    if (!targetMessageId || messagesLoading || messages.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${targetMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand-500", "ring-offset-4", "dark:ring-offset-zinc-900");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-brand-500", "ring-offset-4", "dark:ring-offset-zinc-900");
          setTargetMessageId(null);
        }, 2200);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [targetMessageId, messages, messagesLoading]);

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

  // Keyboard shortcuts: Ctrl/Cmd+K = Command Palette, Ctrl/Cmd+Shift+O = new chat
  const newChatRef = useRef(handleNewConversation);
  newChatRef.current = handleNewConversation;
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.isComposing) return;
      const key = e.key.toLowerCase();
      if (key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (key === "o" && e.shiftKey) {
        e.preventDefault();
        newChatRef.current();
      }
    };
    const onOpenArtifact = (e) => {
      if (e.detail?.code) {
        setActiveArtifact({
          code: e.detail.code,
          language: e.detail.language || "html",
        });
      }
    };
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-artifact-panel", onOpenArtifact);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-artifact-panel", onOpenArtifact);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPwaPrompt) return;
    try {
      deferredPwaPrompt.prompt();
      await deferredPwaPrompt.userChoice;
      setDeferredPwaPrompt(null);
    } catch {
      /* ignore */
    }
  };

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

  const handleExportJson = () => {
    if (messages.length === 0) return;
    const title = activeConversation?.title || t("chat.exportDefaultTitle");
    const jsonText = conversationToJson(title, messages, {
      conversationId: activeConversation?._id || activeId,
      provider: activeConversation?.provider || currentSelection.provider,
      model: activeConversation?.model || currentSelection.model,
    });
    downloadTextFile(`${safeFileName(title, t("chat.exportFileFallback"))}.json`, jsonText, "application/json;charset=utf-8");
    toast.success("Đã xuất hội thoại ra tệp JSON (.json)");
  };

  const handleForkChat = async (message) => {
    if (!activeId || !message?._id) return;
    try {
      const res = await api.post(`/conversations/${activeId}/fork`, {
        messageId: message._id,
      });
      if (res.data.success) {
        toast.success(`Đã tách nhánh cuộc trò chuyện mới (${res.data.data.messageCount} tin nhắn)!`);
        await loadConversations();
        const forkedId = String(res.data.data.conversation.id || res.data.data.conversation._id);
        setActiveId(forkedId);
      }
    } catch {
      toast.error("Không thể tách nhánh cuộc trò chuyện.");
    }
  };

  const handleToggleBookmark = (message) => {
    if (!message?._id || !activeId) return;
    const msgId = String(message._id);
    const convId = String(activeId);
    setBookmarkedMessages((prev) => {
      const exists = prev.some((b) => String(b.messageId) === msgId && String(b.conversationId) === convId);
      let next;
      if (exists) {
        next = prev.filter((b) => !(String(b.messageId) === msgId && String(b.conversationId) === convId));
        toast.info("Đã bỏ đánh dấu tin nhắn.");
      } else {
        const snippet = String(message.content || "")
          .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 140);
        next = [
          {
            messageId: msgId,
            conversationId: convId,
            conversationTitle: activeConversation?.title || "Cuộc trò chuyện",
            snippet: snippet || "Tin nhắn đã đánh dấu",
            model: message.model || currentSelection.model,
            savedAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50);
        toast.success("Đã lưu vào danh sách Tin nhắn đánh dấu (📌)!");
      }
      try {
        localStorage.setItem("chatai_bookmarks_v1", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSaveArenaWinner = async ({ prompt, answer, provider, model }) => {
    try {
      const convId = await ensureConversation();
      const res = await api.post(`/chat/${convId}/save-arena`, {
        prompt,
        answer,
        provider,
        model,
      });
      if (res.data?.success) {
        await refreshMessages(convId);
        await loadConversations();
        toast.success("Đã lưu câu trả lời được chọn vào cuộc trò chuyện!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Không thể lưu kết quả so sánh.");
    }
  };

  const handleSelectPersona = (persona) => {
    setActivePersona(persona);
    setActiveId(null);
    setMessages([]);
    toast.success(`Đã chọn trợ lý: ${persona.name}`);
  };

  const ensureConversation = async () => {
    if (activeId) return activeId;
    const payload = {
      ...draftModel,
      ...(activePersona ? { systemPrompt: activePersona.systemPrompt, personaId: activePersona.id } : {}),
    };
    const res = await api.post("/conversations", payload);
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
            return {
              ...m,
              _id: data.messageId,
              provider: data.provider,
              model: data.model || m.model,
              sources: data.sources || null,
              telemetry: data.telemetry || null,
              error: null,
            };
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
    setRestoredText("");
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
      await sendMessage(convId, content, retryOptions, buildHandlers(assistantKey, { conversationId: convId, userKey, onPreStreamError: async (message, code, metadata = {}) => {
        if (code === "REQUEST_ALREADY_PROCESSED") {
          await refreshMessages(convId);
          toast.error(message);
        } else if (code === "QUOTA_EXCEEDED") {
          setMessages((prev) => prev.filter((m) => m.clientKey !== userKey && m.clientKey !== assistantKey));
          setRestoredText(content);
          loadUsage();
          window.dispatchEvent(new Event("quota-updated"));
          toast.warning(message || "Đã hết hạn mức hôm nay. Vui lòng nâng cấp hoặc đợi đặt lại.");
        } else if (code === "RATE_LIMITED") {
          const retrySec = metadata?.retryAfter ? ` (thử lại sau ${metadata.retryAfter}s)` : "";
          showSendError((message || "Hệ thống đang bận") + retrySec, code);
        } else {
          showSendError(message, code);
        }
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
      await regenerate(activeId, buildHandlers(assistantKey, {
        conversationId: activeId,
        replacedClientKey,
        onPreStreamError: async (message, code, metadata = {}) => {
          if (code === "QUOTA_EXCEEDED") {
            setMessages((prev) => prev.filter((m) => m.clientKey !== assistantKey));
            loadUsage();
            window.dispatchEvent(new Event("quota-updated"));
            toast.warning(message || "Đã hết hạn mức hôm nay. Vui lòng nâng cấp hoặc đợi đặt lại.");
          } else if (code === "RATE_LIMITED") {
            const retrySec = metadata?.retryAfter ? ` (thử lại sau ${metadata.retryAfter}s)` : "";
            patchMessage(assistantKey, () => ({ error: { message: (message || "Hệ thống đang bận") + retrySec, code, retry: "regenerate" } }));
          } else {
            patchMessage(assistantKey, () => ({ error: { message, code, retry: "regenerate" } }));
          }
        },
      }));
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
    const restore = async (message, code, { uncertain, ...metadata } = {}) => {
      if (code === "QUOTA_EXCEEDED") {
        setMessages(snapshot);
        setRestoredText(text);
        loadUsage();
        window.dispatchEvent(new Event("quota-updated"));
        toast.warning(message || "Đã hết hạn mức hôm nay. Vui lòng nâng cấp hoặc đợi đặt lại.");
        return;
      }
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
        onSelect={(id, messageId) => {
          if (sendLockRef.current && !activeIdRef.current) return;
          if (messageId) {
            setTargetMessageId(messageId);
          }
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
        onRefreshConversations={loadConversations}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        collapsed={desktopCollapsed}
        onCollapse={() => setDesktopCollapsed(true)}
        onExpand={() => setDesktopCollapsed(false)}
      />

      <div className="chat-island flex-1 flex flex-col min-w-0 min-h-0 relative z-10 overflow-x-hidden" inert={sidebarOpen && !isDesktop() ? "" : undefined}>
        {/* Mobile Header (< md): Nền đặc, 2 hàng, không blur, chuẩn WCAG AA */}
        <header className="md:hidden flex flex-col bg-white dark:bg-[#12121a] border-b border-zinc-200 dark:border-zinc-800 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2.5 shrink-0 z-30 transition-colors">
          {/* Hàng 1: Nút Menu | Tiêu đề đoạn chat (truncate) | Chip Quota | Nút ⋯ */}
          <div className="flex items-center justify-between gap-2 h-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={t("chat.openSidebar")}
              aria-expanded={sidebarOpen}
              aria-controls="chat-navigation"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>

            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate text-center flex-1 min-w-0 px-1">
              {activeConversation?.title || t("chat.title")}
            </h1>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Chip Quota với mini animated SVG ring */}
              <button
                type="button"
                onClick={() => {
                  setUsageOpen(true);
                  loadUsage();
                }}
                aria-label={t("chat.usageAria")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="7" className="stroke-zinc-200 dark:stroke-zinc-700 fill-none" strokeWidth="2.5" />
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    className={clsx(
                      "fill-none transition-all duration-500",
                      usageTonePill === "danger"
                        ? "stroke-rose-500"
                        : usageTonePill === "warn"
                        ? "stroke-amber-500"
                        : "stroke-emerald-500"
                    )}
                    strokeWidth="2.5"
                    strokeDasharray={44}
                    strokeDashoffset={
                      currentUsage && !currentUsage.unlimited
                        ? 44 - (44 * Math.min(100, Math.max(0, currentUsage.percentRemaining ?? 100))) / 100
                        : 0
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <span className={clsx(
                  TEXT_TONE[usageTonePill],
                  currentUsage?.percentRemaining !== undefined && currentUsage.percentRemaining <= 5 && "animate-pulse"
                )}>
                  {currentUsage && !currentUsage.unlimited ? `${currentUsage.percentRemaining}%` : "100%"}
                </span>
              </button>

              {/* Nút ⋯ mở MobileActionsSheet */}
              <button
                type="button"
                onClick={() => setActionsSheetOpen(true)}
                aria-label={t("chat.moreActions")}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Hàng 2: ModelSelector (flex-1 min-w-0) + Nút Persona nếu active */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 min-w-0">
              <ModelSelector models={models} value={currentSelection} onChange={handleModelChange} />
            </div>
            <button
              type="button"
              onClick={() => setPersonasOpen(true)}
              aria-label={t("personas.tooltip") || "Trợ lý AI chuyên biệt"}
              className={clsx(
                "h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs transition-colors shrink-0 border",
                activePersona
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/30 font-semibold"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              )}
            >
              <Bot size={15} />
              {activePersona && (
                <span className="max-w-[70px] truncate">{getLocalizedPersona(activePersona, lang)?.name || "Persona"}</span>
              )}
            </button>
          </div>
        </header>

        {/* Desktop Header (>= md) */}
        <header className="hidden md:flex chat-header relative z-30 items-center justify-between border-b">
          <div className="chat-header-model"><ModelSelector models={models} value={currentSelection} onChange={handleModelChange} /></div>
          <div className="chat-header-actions flex items-center gap-1.5">
            <Tooltip label="Bảng lệnh nhanh (Ctrl+K)" align="end">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Mở bảng lệnh nhanh Command Palette"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs text-zinc-600 dark:text-zinc-300"
              >
                <Search size={14} className="text-brand-500" />
                <span className="hidden xl:inline">Lệnh nhanh</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  ⌘K
                </kbd>
              </button>
            </Tooltip>

            <Tooltip label="Đấu trường So sánh 2 Mô hình AI cùng lúc" align="end">
              <button
                type="button"
                onClick={() => setArenaOpen(true)}
                aria-label="So sánh 2 mô hình AI"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-brand-500/40 hover:bg-brand-500/10 transition-colors text-xs font-medium text-zinc-700 dark:text-zinc-200"
              >
                <Scale size={14} className="text-brand-500" />
                <span className="hidden lg:inline">So sánh AI</span>
              </button>
            </Tooltip>

            {/* Nút & Popover Danh sách Tin nhắn đã đánh dấu (Bookmarks) */}
            <div className="relative">
              <Tooltip label="Tin nhắn quan trọng đã lưu (Bookmarks)" align="end">
                <button
                  type="button"
                  onClick={() => setBookmarksOpen((v) => !v)}
                  aria-label="Tin nhắn đã đánh dấu"
                  className={clsx(
                    "relative p-2 rounded-xl transition-colors",
                    bookmarksOpen || bookmarkedMessages.length > 0
                      ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  <Bookmark size={17} className={bookmarkedMessages.length > 0 ? "fill-amber-500/30" : ""} />
                  {bookmarkedMessages.length > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {bookmarkedMessages.length}
                    </span>
                  )}
                </button>
              </Tooltip>

              <AnimatePresence>
                {bookmarksOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setBookmarksOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.14 }}
                      className="absolute end-0 mt-2 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181b26] shadow-2xl z-40 overflow-hidden"
                    >
                      <div className="px-3.5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-100">
                          <Bookmark size={13} className="text-amber-500 fill-amber-500" />
                          <span>Tin nhắn đã đánh dấu ({bookmarkedMessages.length})</span>
                        </span>
                        {bookmarkedMessages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setBookmarkedMessages([]);
                              try {
                                localStorage.removeItem("chatai_bookmarks_v1");
                              } catch {
                                /* ignore */
                              }
                            }}
                            className="text-[11px] text-zinc-400 hover:text-red-500 flex items-center gap-1"
                          >
                            <Trash2 size={11} /> Xóa hết
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/70">
                        {bookmarkedMessages.length === 0 ? (
                          <div className="p-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
                            Chưa có tin nhắn nào được đánh dấu. Bấm biểu tượng 📌 dưới câu trả lời của AI để lưu nhanh.
                          </div>
                        ) : (
                          bookmarkedMessages.map((bm) => (
                            <button
                              key={`${bm.conversationId}-${bm.messageId}`}
                              type="button"
                              onClick={() => {
                                setBookmarksOpen(false);
                                setTargetMessageId(bm.messageId);
                                if (String(activeIdRef.current) !== String(bm.conversationId)) {
                                  activeIdRef.current = bm.conversationId;
                                  messageLoadVersionRef.current += 1;
                                  setMessages([]);
                                  setMessagesLoading(true);
                                  setActiveId(bm.conversationId);
                                }
                              }}
                              className="w-full p-3 text-start hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] text-brand-600 dark:text-brand-400 font-semibold mb-0.5">
                                <span className="truncate">{bm.conversationTitle}</span>
                                <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                                  {String(bm.model || "").split("/").pop()}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-snug">
                                {bm.snippet}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Tooltip label={t("personas.tooltip") || "Trợ lý AI chuyên biệt"} align="end">
              <button
                onClick={() => setPersonasOpen(true)}
                aria-label={t("personas.tooltip") || "Trợ lý AI chuyên biệt"}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  activePersona
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <Bot size={18} />
              </button>
            </Tooltip>

            <ThemeToggle />

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

            {/* Menu gộp Chia sẻ & Xuất dữ liệu (Streamlined Header Action Dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={messages.length === 0}
                aria-label="Chia sẻ và Xuất hội thoại"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-xs font-medium text-zinc-700 dark:text-zinc-200"
              >
                <Share2 size={14} className="text-brand-500" />
                <span className="hidden lg:inline">Chia sẻ & Xuất</span>
                <ChevronDown size={13} className="opacity-60" />
              </button>

              <AnimatePresence>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.14 }}
                      className="absolute end-0 mt-2 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181b26] shadow-2xl z-40 p-1.5 space-y-0.5 text-xs"
                    >
                      <button
                        type="button"
                        disabled={!activeId || messages.length === 0}
                        onClick={() => {
                          setExportMenuOpen(false);
                          setShareOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 text-start transition-colors"
                      >
                        <Share2 size={15} className="text-brand-500 shrink-0" />
                        <span>{t("chat.shareTip") || "Chia sẻ liên kết công khai"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false);
                          handleExport();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-start transition-colors"
                      >
                        <Download size={15} className="text-emerald-500 shrink-0" />
                        <span>Xuất tệp Markdown (.md)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false);
                          handleExportJson();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-start transition-colors"
                      >
                        <FileJson size={15} className="text-amber-500 shrink-0" />
                        <span>Xuất dữ liệu JSON (.json)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false);
                          window.print();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-start transition-colors"
                      >
                        <Printer size={15} className="text-sky-500 shrink-0" />
                        <span>{t("chat.printTip") || "In / Lưu PDF"}</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <AnnouncementBanner />

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
                <BrandMark size={44} className="mb-4" />
                <p className="text-sm font-medium text-brand-600 dark:text-brand-300 mb-1">
                  {t("chat.hello", { name: user?.username || t("chat.friend") })}
                </p>
                <h2 className="font-display text-2xl font-semibold mb-1 tracking-tight">{t("chat.title")}</h2>
                <p className="text-sm workspace-muted mt-1.5 mb-5 max-w-md leading-relaxed">{t("chat.tagline")}</p>

                {/* Bộ lọc danh mục Prompt mẫu */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4 max-w-2xl">
                  {PROMPT_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = promptCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPromptCategory(cat.id)}
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                          isActive
                            ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                            : "bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-brand-400/50"
                        )}
                      >
                        <Icon size={13} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                  {promptCategory === "default"
                    ? SUGGESTION_KEYS.map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSend(t(key))}
                          disabled={isStreaming || isSubmitting}
                          className="chat-suggestion"
                        >
                          <span>{t(key)}</span>
                          <ArrowUpRight size={16} className="shrink-0 workspace-muted" />
                        </button>
                      ))
                    : (PROMPT_CATEGORIES.find((c) => c.id === promptCategory)?.prompts || []).map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(promptText)}
                          disabled={isStreaming || isSubmitting}
                          className="chat-suggestion"
                        >
                          <span>{promptText}</span>
                          <ArrowUpRight size={16} className="shrink-0 workspace-muted" />
                        </button>
                      ))}
                </div>

                {/* Nút mở nhanh Trợ lý chuyên biệt, So sánh AI & Bảng lệnh trên màn hình Welcome */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPersonasOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 hover:border-brand-500/40 text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    <Bot size={14} className="text-brand-500" />
                    <span>Trợ lý AI chuyên biệt (Personas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArenaOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 hover:border-brand-500/40 text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    <Scale size={14} className="text-brand-500" />
                    <span>So sánh 2 Mô hình AI (Model Arena)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 hover:border-brand-500/40 text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    <Search size={13} className="text-brand-500" />
                    <span>Nhấn <kbd className="font-mono font-semibold">Ctrl+K</kbd> mở Bảng lệnh</span>
                  </button>
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
                    onFork={handleForkChat}
                    onSendFollowUp={(promptText) => handleSend(promptText)}
                    isBookmarked={bookmarkedMessages.some(
                      (b) => String(b.messageId) === String(m._id) && String(b.conversationId) === String(activeId)
                    )}
                    onToggleBookmark={handleToggleBookmark}
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

        {activePersona && (() => {
          const locPersona = getLocalizedPersona(activePersona, t);
          return (
            <div className="px-4 py-1.5 bg-brand-500/5 dark:bg-brand-500/10 border-t border-brand-500/20 text-xs flex items-center justify-between text-brand-700 dark:text-brand-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span>{locPersona.avatar || "🤖"}</span>
                <span>{t("personas.activeNotice") || "Đang kích hoạt trợ lý:"} <strong>{locPersona.name}</strong> ({locPersona.role})</span>
              </span>
              <button
                onClick={() => setActivePersona(null)}
                className="text-xs hover:underline opacity-80 hover:opacity-100"
              >
                {t("personas.cancelPersona") || "Hủy chế độ trợ lý"}
              </button>
            </div>
          );
        })()}


        {/* ── Quota Banners (animated entrance, fully accessible) ── */}
        <AnimatePresence mode="wait">
          {usage?.quota?.isExhausted ? (
            /* Exhausted – đã hết 100% */
            <motion.div
              key="quota-exhausted"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="mx-3 sm:mx-4 mb-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert size={18} aria-hidden="true" className="text-red-500 shrink-0" />
                <span>
                  Bạn đã dùng hết{" "}
                  <strong>{usage.quota.dailyLimit?.toLocaleString()} tokens</strong>{" "}
                  hôm nay (Gói {usage.quota.tier?.toUpperCase()}). Hạn mức đặt lại lúc 00:00
                  {usage.quota.timezone ? ` (${usage.quota.timezone})` : ""}.
                </span>
              </div>
              <Link
                to="/pricing"
                aria-label="Nâng cấp gói để tiếp tục chat"
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <span>Nâng cấp ngay</span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </motion.div>
          ) : usage?.quota?.isWarning ? (
            /* Warning – ≥ 80% */
            <motion.div
              key="quota-warning"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="mx-3 sm:mx-4 mb-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle size={16} aria-hidden="true" className="text-amber-500 shrink-0" />
                <span>
                  Bạn đã sử dụng{" "}
                  <strong>{usage.quota.percentUsed}%</strong>{" "}
                  hạn mức hôm nay ({usage.quota.usedToday?.toLocaleString()} /{" "}
                  {usage.quota.dailyLimit?.toLocaleString()} tokens).
                </span>
              </div>
              <Link
                to="/pricing"
                aria-label="Mở rộng hạn mức token bằng cách nâng cấp gói"
                className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:underline flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
              >
                <span>Mở rộng hạn mức</span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ChatInput key={activeId || "draft"} onSend={handleSend} isStreaming={isStreaming} disabled={isSubmitting || messagesLoading || Boolean(usage?.quota?.isExhausted)} onStop={stop} allowImage={allowImage} restoredText={restoredText} />
        <UsageModal
          open={usageOpen}
          onClose={() => setUsageOpen(false)}
          usage={usage}
          loading={usageLoading}
          error={usageError}
          onRefresh={loadUsage}
          current={currentSelection}
        />
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          conversation={activeConversation}
        />
        <PersonasModal
          open={personasOpen}
          onClose={() => setPersonasOpen(false)}
          onSelectPersona={handleSelectPersona}
        />
        <ProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          conversations={conversations}
          activeId={activeId}
          models={models}
          currentModelSelection={currentSelection}
          user={user}
          hasMessages={messages.length > 0}
          onNewChat={handleNewConversation}
          onSelectConversation={(id) => {
            if (activeIdRef.current !== id) {
              activeIdRef.current = id;
              messageLoadVersionRef.current += 1;
              setMessages([]);
              setMessagesLoading(true);
            }
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onSelectModel={handleModelChange}
          onOpenPersonas={() => setPersonasOpen(true)}
          onOpenArena={() => setArenaOpen(true)}
          onOpenUsage={() => {
            setUsageOpen(true);
            loadUsage();
          }}
          onOpenProfile={() => setProfileModalOpen(true)}
          onExportMarkdown={handleExport}
          onExportJson={handleExportJson}
          onShare={() => setShareOpen(true)}
          onNavigate={(path) => navigate(path)}
          deferredPwaPrompt={deferredPwaPrompt}
          onInstallPwa={handleInstallPwa}
        />
        <ModelArenaModal
          open={arenaOpen}
          onClose={() => setArenaOpen(false)}
          models={models}
          currentSelection={currentSelection}
          onSaveWinner={handleSaveArenaWinner}
        />
        <CodePreviewModal
          open={Boolean(expandedArtifactModal)}
          onClose={() => setExpandedArtifactModal(null)}
          code={expandedArtifactModal?.code || ""}
          language={expandedArtifactModal?.language || "html"}
        />
        <MobileActionsSheet
          open={actionsSheetOpen}
          onClose={() => setActionsSheetOpen(false)}
          onShare={() => setShareOpen(true)}
          onPrint={() => window.print()}
          onExport={handleExport}
          canShare={Boolean(activeId && messages.length > 0)}
          canExport={messages.length > 0}
        />
      </div>

      {/* Khung Artifact Canvas nằm bên phải màn hình (Side-by-side Split Panel) */}
      <ArtifactSidePanel
        artifact={activeArtifact}
        onClose={() => setActiveArtifact(null)}
        onExpandModal={(art) => {
          setActiveArtifact(null);
          setExpandedArtifactModal(art);
        }}
      />
    </div>
  );
}
