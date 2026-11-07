import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Bot,
  Gauge,
  Download,
  FileJson,
  Share2,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Cpu,
  UserCog,
  Compass,
  CornerDownLeft,
  X,
  Smartphone,
  Scale,
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function CommandPalette({
  open,
  onClose,
  conversations = [],
  activeId,
  models = [],
  currentModelSelection,
  user,
  hasMessages = false,
  onNewChat,
  onSelectConversation,
  onSelectModel,
  onOpenPersonas,
  onOpenArena,
  onOpenUsage,
  onOpenProfile,
  onExportMarkdown,
  onExportJson,
  onShare,
  onNavigate,
  deferredPwaPrompt,
  onInstallPwa,
}) {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];

    // 1. Nhóm Thao tác nhanh
    const actions = [
      {
        id: "act-new-chat",
        group: "Thao tác nhanh",
        label: "Tạo cuộc trò chuyện mới",
        sublabel: "Bắt đầu phiên hỏi đáp trống",
        shortcut: "Ctrl+Shift+O",
        icon: Plus,
        action: () => onNewChat?.(),
      },
      {
        id: "act-personas",
        group: "Thao tác nhanh",
        label: "Chọn Trợ lý AI chuyên biệt (Personas)",
        sublabel: "Kích hoạt chuyên gia lập trình, dịch thuật, phân tích...",
        icon: Bot,
        action: () => onOpenPersonas?.(),
      },
      {
        id: "act-arena",
        group: "Thao tác nhanh",
        label: "Đấu trường So sánh 2 Mô hình AI (Split Model Arena)",
        sublabel: "Gửi 1 câu hỏi cho 2 AI cùng lúc, đối chiếu tốc độ và lập luận",
        icon: Scale,
        action: () => onOpenArena?.(),
      },
      {
        id: "act-memories",
        group: "Thao tác nhanh",
        label: "Hồ sơ & Bộ nhớ dài hạn (User Memories)",
        sublabel: "Quản lý ghi nhớ cá nhân hóa và chỉ dẫn hệ thống",
        icon: UserCog,
        action: () => onOpenProfile?.(),
      },
      {
        id: "act-usage",
        group: "Thao tác nhanh",
        label: "Kiểm tra Hạn mức Token & Lưu lượng",
        sublabel: "Xem số token đã dùng hôm nay theo từng mô hình",
        icon: Gauge,
        action: () => onOpenUsage?.(),
      },
      {
        id: "act-theme",
        group: "Thao tác nhanh",
        label: theme === "dark" ? "Chuyển sang Giao diện Sáng (Light Mode)" : "Chuyển sang Giao diện Tối (Dark Mode)",
        sublabel: `Đang dùng chế độ ${theme === "dark" ? "Tối" : "Sáng"}`,
        icon: theme === "dark" ? Sun : Moon,
        action: () => toggleTheme?.(),
      },
      ...(hasMessages
        ? [
            {
              id: "act-export-md",
              group: "Thao tác nhanh",
              label: "Xuất hội thoại ra Markdown (.md)",
              sublabel: "Tải toàn bộ nội dung chat hiện tại dưới dạng tài liệu Markdown",
              icon: Download,
              action: () => onExportMarkdown?.(),
            },
            {
              id: "act-export-json",
              group: "Thao tác nhanh",
              label: "Xuất hội thoại ra JSON (.json)",
              sublabel: "Tải dữ liệu cấu trúc JSON của cuộc trò chuyện hiện tại",
              icon: FileJson,
              action: () => onExportJson?.(),
            },
            {
              id: "act-share",
              group: "Thao tác nhanh",
              label: "Chia sẻ liên kết cuộc trò chuyện",
              sublabel: "Tạo đường dẫn công khai để gửi cho người khác",
              icon: Share2,
              action: () => onShare?.(),
            },
          ]
        : []),
      ...(deferredPwaPrompt
        ? [
            {
              id: "act-install-pwa",
              group: "Thao tác nhanh",
              label: "Cài đặt ứng dụng Chat AI về máy (PWA)",
              sublabel: "Chạy độc lập như ứng dụng Desktop / Mobile",
              icon: Smartphone,
              action: () => onInstallPwa?.(),
            },
          ]
        : []),
      {
        id: "act-pricing",
        group: "Thao tác nhanh",
        label: "Nâng cấp gói dịch vụ (Plus / Pro)",
        sublabel: "Xem bảng giá và mở khóa giới hạn token, Web Search, Vision",
        icon: Sparkles,
        action: () => onNavigate?.("/pricing"),
      },
      {
        id: "act-landing",
        group: "Thao tác nhanh",
        label: "Trang giới thiệu sản phẩm (Landing Page)",
        sublabel: "Khám phá tổng quan tính năng và kiến trúc hệ thống",
        icon: Compass,
        action: () => onNavigate?.("/welcome"),
      },
      ...(user?.role === "admin"
        ? [
            {
              id: "act-admin",
              group: "Thao tác nhanh",
              label: "Mở Bảng điều khiển Quản trị (Admin Portal)",
              sublabel: "Quản lý người dùng, duyệt nâng cấp gói, cấu hình AI Models",
              icon: ShieldCheck,
              action: () => onNavigate?.("/admin"),
            },
          ]
        : []),
    ];

    for (const act of actions) {
      if (!q || act.label.toLowerCase().includes(q) || act.sublabel.toLowerCase().includes(q)) {
        list.push(act);
      }
    }

    // 2. Nhóm Đổi nhanh Mô hình AI
    const availableModels = models.filter((m) => m.available !== false);
    for (const m of availableModels) {
      const isCurrent =
        currentModelSelection?.provider === m.provider && currentModelSelection?.model === m.modelId;
      const searchTarget = `${m.displayName || ""} ${m.modelId || ""} ${m.provider || ""}`.toLowerCase();
      if (!q || searchTarget.includes(q) || "model đổi mô hình ai".includes(q)) {
        list.push({
          id: `model-${m.provider}-${m.modelId}`,
          group: "Đổi nhanh Mô hình AI",
          label: m.displayName || m.modelId,
          sublabel: `${String(m.provider || "").toUpperCase()} • ${m.modelId}`,
          badge: isCurrent ? "Đang dùng" : m.capabilities?.includes("vision") ? "Vision" : null,
          icon: Cpu,
          action: () => onSelectModel?.({ provider: m.provider, model: m.modelId }),
        });
      }
    }

    // 3. Nhóm Hội thoại gần đây
    const matchingConvs = conversations
      .filter((c) => !q || (c.title || "").toLowerCase().includes(q))
      .slice(0, 12);

    for (const conv of matchingConvs) {
      const isCurrent = conv._id === activeId;
      list.push({
        id: `conv-${conv._id}`,
        group: "Hội thoại gần đây",
        label: conv.title || "Cuộc trò chuyện chưa đặt tên",
        sublabel: `${String(conv.provider || "ai").toUpperCase()} • ${conv.model || ""}`,
        badge: isCurrent ? "Hiện tại" : conv.pinned ? "Đã ghim" : null,
        icon: MessageSquare,
        action: () => onSelectConversation?.(conv._id),
      });
    }

    return list;
  }, [
    query,
    theme,
    hasMessages,
    deferredPwaPrompt,
    user?.role,
    models,
    currentModelSelection,
    conversations,
    activeId,
    onNewChat,
    onOpenPersonas,
    onOpenProfile,
    onOpenUsage,
    toggleTheme,
    onExportMarkdown,
    onExportJson,
    onShare,
    onInstallPwa,
    onNavigate,
    onSelectModel,
    onSelectConversation,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
        return;
      }
      if (e.key === "Enter" && items[selectedIndex]) {
        e.preventDefault();
        const chosen = items[selectedIndex];
        onClose();
        chosen.action?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items, selectedIndex, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  // Gom nhóm để hiển thị tiêu đề phân mục nhưng vẫn giữ index phẳng cho phím mũi tên
  const groupedSections = [];
  let currentGroup = null;
  items.forEach((item, flatIndex) => {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      groupedSections.push({ group: currentGroup, entries: [] });
    }
    groupedSections[groupedSections.length - 1].entries.push({ ...item, flatIndex });
  });

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[140] flex items-start justify-center pt-[10vh] px-3 sm:px-4 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh nhanh (Command Palette)"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#161822] border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[76vh]"
        >
          {/* Thanh tìm kiếm */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
            <Search size={18} className="text-brand-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Gõ lệnh, tìm kiếm cuộc trò chuyện, hoặc đổi nhanh mô hình AI..."
              className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Xóa từ khóa"
              >
                <X size={15} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-zinc-800 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Danh sách kết quả */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
            {groupedSections.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Không tìm thấy lệnh hoặc hội thoại nào khớp với <strong>"{query}"</strong>.
              </div>
            ) : (
              groupedSections.map((section) => (
                <div key={section.group}>
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {section.group}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {section.entries.map((entry) => {
                      const Icon = entry.icon;
                      const isSelected = entry.flatIndex === selectedIndex;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          data-cmd-index={entry.flatIndex}
                          onMouseEnter={() => setSelectedIndex(entry.flatIndex)}
                          onClick={() => {
                            onClose();
                            entry.action?.();
                          }}
                          className={clsx(
                            "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-start transition-colors",
                            isSelected
                              ? "bg-brand-500/12 dark:bg-brand-500/20 text-brand-700 dark:text-brand-200"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={clsx(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "bg-brand-500 text-white shadow-xs"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate flex items-center gap-2">
                                <span className="truncate">{entry.label}</span>
                                {entry.badge && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-300 shrink-0">
                                    {entry.badge}
                                  </span>
                                )}
                              </div>
                              {entry.sublabel && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {entry.sublabel}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {entry.shortcut && (
                              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {entry.shortcut}
                              </kbd>
                            )}
                            {isSelected && <CornerDownLeft size={14} className="text-brand-500 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer hướng dẫn phím tắt */}
          <div className="px-4 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[10px]">↑↓</kbd> Di chuyển
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[10px]">↵</kbd> Chọn
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[10px]">ESC</kbd> Đóng
              </span>
            </div>
            <span className="font-medium text-brand-600 dark:text-brand-400">Chat AI Command Center</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

