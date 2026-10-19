import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pin, Pencil, Trash2, LogOut, ShieldCheck, X, Check, PanelLeftClose, PanelLeftOpen, SquarePen, MessageSquare, Dices, Loader2, ArrowUpRight, Settings, Folder, FolderPlus, FolderInput, ChevronDown, ChevronRight, Download } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import BrandMark from "./BrandMark.jsx";
import Tooltip from "./Tooltip.jsx";
import UserAvatar from "./UserAvatar.jsx";
import ProfileModal from "./ProfileModal.jsx";
import FolderModal from "./FolderModal.jsx";
import InstallAppModal from "./InstallAppModal.jsx";
import SidebarQuota from "./SidebarQuota.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useModalA11y } from "../hooks/useModalA11y.js";
import { usePWAInstall } from "../hooks/usePWAInstall.js";

// Tiêu đề mặc định do server tạo (có/không dấu) -> hiển thị theo ngôn ngữ giao diện.
const DEFAULT_TITLES = new Set(["Cuoc tro chuyen moi", "Cuộc trò chuyện mới"]);
const isDefaultTitle = (title) => DEFAULT_TITLES.has(title);

function groupByDate(conversations) {
  const pinned = conversations.filter((c) => c.pinned);
  const rest = conversations.filter((c) => !c.pinned);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const buckets = { today: [], yesterday: [], last7: [], older: [] };
  for (const c of rest) {
    const d = new Date(c.updatedAt || c.createdAt);
    if (d >= startOfToday) buckets.today.push(c);
    else if (d >= startOfYesterday) buckets.yesterday.push(c);
    else if (d >= sevenDaysAgo) buckets.last7.push(c);
    else buckets.older.push(c);
  }

  const groups = [];
  if (pinned.length) groups.push({ key: "sidebar.pinned", items: pinned });
  if (buckets.today.length) groups.push({ key: "sidebar.today", items: buckets.today });
  if (buckets.yesterday.length) groups.push({ key: "sidebar.yesterday", items: buckets.yesterday });
  if (buckets.last7.length) groups.push({ key: "sidebar.last7", items: buckets.last7 });
  if (buckets.older.length) groups.push({ key: "sidebar.older", items: buckets.older });
  return groups;
}

function MoveFolderMenu({ conv, folders, onClose, onMoveFolder, anchorRect }) {
  const { t } = useI18n();
  if (typeof document === "undefined" || !anchorRect) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: Math.min(window.innerHeight - 240, Math.max(10, anchorRect.bottom + 4)),
          left: Math.min(window.innerWidth - 230, Math.max(10, anchorRect.left - 140)),
        }}
        className="fixed w-56 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 text-xs space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100"
      >
        <p className="px-2.5 pt-1 pb-1 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">
          {t("folder.moveTo")}
        </p>
        <button
          onClick={() => { onMoveFolder(conv._id, null); onClose(); }}
          className={clsx(
            "w-full text-start px-2.5 py-2 rounded-xl flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
            !conv.folderId && "font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10"
          )}
        >
          <Folder size={14} className="opacity-50" />
          <span className="truncate">{t("folder.none")}</span>
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => { onMoveFolder(conv._id, f.id); onClose(); }}
            className={clsx(
              "w-full text-start px-2.5 py-2 rounded-xl flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
              String(conv.folderId) === String(f.id) && "font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10"
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: f.color || "#6366f1" }} />
            <span className="truncate flex-1">{f.name}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

function ConversationRow({ conv, isActive, isEditing, editValue, onEditValueChange, onSelect, onStartEdit, onCommitEdit, onPin, onDelete, onOpenMoveMenu }) {
  const { t } = useI18n();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onSelect}
      className={clsx(
        "group relative flex items-center gap-2 ps-3.5 pe-2 py-2.5 rounded-xl cursor-pointer text-sm transition-colors overflow-hidden",
        isActive ? "bg-brand-500/10 text-brand-700 dark:text-brand-200" : "hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {isActive && (
        <motion.span layoutId="active-rail" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-linear-to-b from-brand-400 to-ion-400" />
      )}
      {conv.pinned && <Pin size={12} className="shrink-0 opacity-60" />}
      {isEditing ? (
        <input
          autoFocus
          aria-label={t("sidebar.rename")}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCommitEdit()}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent outline-hidden border-b border-brand-400"
        />
      ) : (
        <button
          type="button"
          aria-pressed={isActive}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="flex-1 min-w-0 truncate text-start"
        >
          {isDefaultTitle(conv.title) ? t("sidebar.newChat") : conv.title}
        </button>
      )}

      {isEditing ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommitEdit();
          }}
          aria-label={t("sidebar.saveName")}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          <Check size={13} />
        </button>
      ) : (
        <div className="flex md:hidden md:group-hover:flex md:group-focus-within:flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMoveMenu?.(conv, e.currentTarget.getBoundingClientRect());
            }}
            aria-label={t("folder.moveTo")}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title={t("folder.moveTo")}
          >
            <FolderInput size={13} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            aria-label={conv.pinned ? t("sidebar.unpin") : t("sidebar.pin")}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Pin size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            aria-label={t("sidebar.rename")}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={t("sidebar.delete")}
            className="p-1 rounded hover:bg-red-500/10 text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function FolderAccordionItem({
  folder,
  items,
  isCollapsed,
  onToggle,
  onEdit,
  onDelete,
  activeId,
  editingId,
  editValue,
  onEditValueChange,
  onSelect,
  onStartEdit,
  onCommitEdit,
  onPin,
  onDeleteConv,
  onOpenMoveMenu,
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl overflow-hidden mb-1">
      <div
        onClick={onToggle}
        className="group/folder flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 text-zinc-400 group-hover/folder:text-zinc-600 dark:group-hover/folder:text-zinc-200">
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </span>
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: folder.color || "#6366f1" }}
          />
          <span className="truncate font-semibold">{folder.name}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-zinc-500 font-mono">
            {items.length}
          </span>
        </div>

        <div className="hidden group-hover/folder:flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(folder)}
            aria-label={t("folder.editFolder")}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title={t("folder.editFolder")}
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(folder)}
            aria-label={t("folder.deleteFolder")}
            className="p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500"
            title={t("folder.deleteFolder")}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="ps-2 pe-0.5 pt-0.5 pb-1 space-y-0.5 border-l-2 border-brand-500/20 dark:border-brand-500/30 ms-3 mt-0.5">
          {items.length === 0 ? (
            <p className="text-[11px] text-zinc-400 py-1 px-2 italic">{t("folder.empty")}</p>
          ) : (

            items.map((conv) => (
              <ConversationRow
                key={conv._id}
                conv={conv}
                isActive={activeId === conv._id}
                isEditing={editingId === conv._id}
                editValue={editValue}
                onEditValueChange={onEditValueChange}
                onSelect={() => onSelect(conv._id)}
                onStartEdit={() => onStartEdit(conv)}
                onCommitEdit={onCommitEdit}
                onPin={() => onPin(conv._id, !conv.pinned)}
                onDelete={() => onDeleteConv(conv._id)}
                onOpenMoveMenu={onOpenMoveMenu}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Nút trên thanh icon thu gọn, kèm tooltip dùng chung. wrapperClassName áp dụng cho thẻ bọc (vd. "mt-auto"). */
function RailButton({ label, shortcut, onClick, className, wrapperClassName, children, ...rest }) {
  return (
    <Tooltip label={label} shortcut={shortcut} side="right" className={clsx("inline-flex", wrapperClassName)}>
      <button {...rest} aria-label={label} onClick={onClick} className={className}>
        {children}
      </button>
    </Tooltip>
  );
}

/** Popover nổi bên cạnh thanh icon: danh sách chat đã ghim / gần đây. Render qua portal để không bị aside cắt (overflow-hidden). */
function RailFlyout({ flyout, conversations, activeId, onPick, onShowAll, onEnter, onLeave }) {
  const { t } = useI18n();
  if (typeof document === "undefined") return null;
  const isPinned = flyout?.type === "pinned";
  const items = !flyout
    ? []
    : isPinned
    ? conversations.filter((c) => c.pinned)
    : [...conversations]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 8);

  return createPortal(
    <AnimatePresence>
      {flyout && (
        <motion.div
          key={flyout.type}
          data-flyout
          role="menu"
          aria-label={isPinned ? t("sidebar.flyoutPinned") : t("sidebar.flyoutRecent")}
          initial={{ opacity: 0, x: -6, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -4, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            top: flyout.top,
            left: flyout.left,
            maxHeight: `calc(100vh - ${flyout.top}px - 16px)`,
            transformOrigin: "left top",
          }}
          className="fixed z-50 w-64 flex flex-col rounded-2xl p-1.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.28)] text-black dark:text-white"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium opacity-50">{isPinned ? t("sidebar.pinned") : t("sidebar.recent")}</p>

          {items.length === 0 ? (
            <div className="px-3 py-5 text-center text-xs opacity-50">
              {isPinned ? <Pin size={16} className="mx-auto mb-2" /> : <MessageSquare size={16} className="mx-auto mb-2" />}
              {isPinned ? t("sidebar.emptyPinned") : t("sidebar.emptyRecent")}
            </div>
          ) : (
            <div className="overflow-y-auto min-h-0 space-y-0.5">
              {items.map((c) => (
                <button
                  key={c._id}
                  role="menuitem"
                  onClick={() => onPick(c._id)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-start transition-colors",
                    c._id === activeId
                      ? "bg-brand-500/10 text-brand-700 dark:text-brand-200"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                >
                  <MessageSquare size={15} className="shrink-0 opacity-60" />
                  <span className="truncate">{isDefaultTitle(c.title) ? t("sidebar.newChat") : c.title}</span>
                </button>
              ))}
            </div>
          )}

          {!isPinned && items.length > 0 && (
            <button
              onClick={onShowAll}
              className="mt-1 w-full px-2.5 py-2 rounded-xl text-xs text-start opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              {t("sidebar.viewAll")}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onSearch,
  onRename,
  onPin,
  onDelete,
  onRefreshConversations,
  isOpen,
  onCloseMobile,
  collapsed = false,
  onCollapse,
  onExpand,
}) {
  const { user, logout, randomizeAvatar } = useAuth();
  const { t, errorMessage } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageResults, setMessageResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const drawerRef = useModalA11y(isOpen && isMobile, onCloseMobile);

  // Quản lý Thư mục Chat
  const [folders, setFolders] = useState([]);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
  const [moveMenuState, setMoveMenuState] = useState(null);

  const loadFolders = async () => {
    try {
      const res = await api.get("/folders");
      if (res.data.success) {
        setFolders(res.data.data.folders || []);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleMoveFolder = async (convId, folderId) => {
    try {
      await api.patch(`/conversations/${convId}`, { folderId });
      toast.success(folderId ? t("folder.movedIn") : t("folder.movedOut"));
      await loadFolders();
      onRefreshConversations?.();
    } catch {
      toast.error(errorMessage("Không thể chuyển thư mục."));
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(t("folder.deleteConfirm", { name: folder.name }).replace("{name}", folder.name))) return;
    try {
      await api.delete(`/folders/${folder.id}`);
      toast.success(t("folder.deleteFolder"));
      await loadFolders();
      onRefreshConversations?.();
    } catch {
      toast.error(errorMessage("Không thể xóa thư mục."));
    }
  };


  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Popover của thanh icon thu gọn (đã ghim / gần đây)
  const [flyout, setFlyout] = useState(null);
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleInstallClick = async (e) => {
    e?.stopPropagation?.();
    if (isIOS) {
      setInstallModalOpen(true);
      return;
    }
    const res = await promptInstall();
    if (res === "unavailable" || res === "ios_guide") {
      setInstallModalOpen(true);
    }
  };
  const closeTimer = useRef(null);
  const isFlyoutOpen = flyout !== null;
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyout(null), 200);
  };
  const openFlyout = (type, el) => {
    cancelClose();
    const r = el.getBoundingClientRect();
    setFlyout({ type, top: Math.max(8, r.top - 6), left: r.right + 12 });
  };

  useEffect(() => {
    if (!collapsed) setFlyout(null);
  }, [collapsed]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!isFlyoutOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setFlyout(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-flyout]")) setFlyout(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [isFlyoutOpen]);

  const unfolderedConversations = useMemo(
    () => conversations.filter((c) => !c.folderId),
    [conversations]
  );
  const groups = useMemo(() => groupByDate(unfolderedConversations), [unfolderedConversations]);

  const startEdit = (conv) => {
    setEditingId(conv._id);
    setEditValue(isDefaultTitle(conv.title) ? t("sidebar.newChat") : conv.title);
  };

  const commitEdit = () => {
    if (editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  };

  const handleRandomAvatar = async (e) => {
    e?.stopPropagation?.();
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      await randomizeAvatar();
      toast.success(t("sidebar.avatarChanged"));
    } catch (err) {
      toast.error(errorMessage(err, "sidebar.avatarFailed"));
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        id="chat-navigation"
        ref={drawerRef}
        role={isOpen && isMobile ? "dialog" : undefined}
        aria-modal={isOpen && isMobile ? true : undefined}
        aria-label={t("admin.nav.conversations")}
        inert={isMobile && !isOpen ? "" : undefined}
        tabIndex={-1}
        className={clsx(
          "chat-sidebar fixed md:relative inset-y-0 left-0 z-40 w-72 shrink-0 border-r overflow-hidden transition-[transform,width] duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-72"
        )}
      >
        <div
          className={clsx(
            "flex flex-col h-full min-h-0 w-72 shrink-0 transition-[opacity,visibility] duration-200",
            collapsed && "md:opacity-0 md:invisible"
          )}
        >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 px-1">
            <BrandMark size={32} />
            <span className="font-display font-semibold text-[15px] tracking-tight">Chat AI</span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label={t("sidebar.closeList")}
            className="md:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
          <Tooltip label={t("sidebar.collapse")} className="hidden md:inline-flex">
<button
            onClick={onCollapse}
            aria-label={t("sidebar.collapse")}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <PanelLeftClose size={18} />
          </button>
</Tooltip>
        </div>

        <div className="px-3">
          
          <Tooltip label={t("sidebar.newChat")} shortcut="Ctrl+Shift+O" className="flex w-full">
<motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNew}
            className="w-full flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} /> {t("sidebar.newChat")}
          </motion.button>
</Tooltip>
        </div>

        <div className="px-3 mt-3">
          <div className="sidebar-search-box flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-zinc-200/60 dark:border-zinc-800/80 focus-within:border-brand-500/80 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-xs">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <label htmlFor="sidebar-search" className="sr-only">
              {t("sidebar.searchLabel")}
            </label>
            <input
              id="sidebar-search"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                onSearch(val);
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                if (val.trim().length >= 2) {
                  setSearchLoading(true);
                  searchTimerRef.current = setTimeout(async () => {
                    try {
                      const res = await api.get("/conversations/search-messages", { params: { q: val.trim() } });
                      if (res.data.success) {
                        setMessageResults(res.data.data.results || []);
                      }
                    } catch {
                      setMessageResults([]);
                    } finally {
                      setSearchLoading(false);
                    }
                  }, 300);
                } else {
                  setMessageResults([]);
                  setSearchLoading(false);
                }
              }}
              placeholder={t("sidebar.searchPlaceholder")}
              className="bg-transparent border-0 outline-none text-sm flex-1 min-w-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  onSearch("");
                  setMessageResults([]);
                }}
                className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                title={t("folder.clearSearch")}
              >
                <X size={13} />
              </button>
            )}
            {searchLoading && <Loader2 size={13} className="animate-spin text-brand-500 shrink-0" />}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mt-3 px-2 space-y-3">
          {/* Kết quả tin nhắn khớp từ khóa */}
          {messageResults.length > 0 && (
            <div className="pb-2 mb-2 border-b border-edge-light dark:border-edge-dark">
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                {t("folder.messageResults")} ({messageResults.length})
              </p>
              <div className="space-y-1">
                {messageResults.map((res) => (
                  <button
                    key={res.messageId}
                    onClick={() => {
                      onSelect(res.conversationId, res.messageId);
                      if (isMobile) onCloseMobile();
                    }}
                    className="w-full text-start p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors space-y-0.5 group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 truncate">
                      <MessageSquare size={12} className="shrink-0 opacity-70" />
                      <span className="truncate">{res.conversationTitle}</span>
                    </div>
                    <p className="text-[12px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-snug">
                      {res.contentSnippet}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Danh sách Thư mục */}
          {folders.length > 0 && (
            <div className="pb-2 mb-2 border-b border-edge-light dark:border-edge-dark">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50 flex items-center gap-1.5">
                  <Folder size={12} />
                  <span>{t("folder.title")} ({folders.length})</span>
                </span>
                <button
                  onClick={() => { setEditingFolder(null); setFolderModalOpen(true); }}
                  aria-label={t("folder.newFolder")}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title={t("folder.newFolder")}
                >
                  <FolderPlus size={13} />
                </button>
              </div>

              <div className="space-y-0.5">
                {folders.map((folder) => {
                  const folderConvs = conversations.filter((c) => String(c.folderId) === String(folder.id));
                  const isCollapsed = collapsedFolders.has(folder.id);
                  return (
                    <FolderAccordionItem
                      key={folder.id}
                      folder={folder}
                      items={folderConvs}
                      isCollapsed={isCollapsed}
                      onToggle={() => {
                        setCollapsedFolders((prev) => {
                          const next = new Set(prev);
                          if (next.has(folder.id)) next.delete(folder.id);
                          else next.add(folder.id);
                          return next;
                        });
                      }}
                      onEdit={(f) => { setEditingFolder(f); setFolderModalOpen(true); }}
                      onDelete={handleDeleteFolder}
                      activeId={activeId}
                      editingId={editingId}
                      editValue={editValue}
                      onEditValueChange={setEditValue}
                      onSelect={(id) => onSelect(id)}
                      onStartEdit={startEdit}
                      onCommitEdit={commitEdit}
                      onPin={(id, p) => onPin(id, p)}
                      onDeleteConv={onDelete}
                      onOpenMoveMenu={(conv, rect) => setMoveMenuState({ conv, anchorRect: rect })}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Nút tạo thư mục đầu tiên nếu chưa có thư mục nào */}
          {folders.length === 0 && (
            <div className="px-3 pb-1">
              <button
                onClick={() => { setEditingFolder(null); setFolderModalOpen(true); }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-dashed border-edge-light dark:border-edge-dark text-xs text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500/30 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <FolderPlus size={13} />
                  <span>Tạo thư mục mới</span>
                </span>
                <Plus size={12} />
              </button>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.key}>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-40">{t(group.key)}</p>
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {group.items.map((conv) => (
                    <ConversationRow
                      key={conv._id}
                      conv={conv}
                      isActive={activeId === conv._id}
                      isEditing={editingId === conv._id}
                      editValue={editValue}
                      onEditValueChange={setEditValue}
                      onSelect={() => onSelect(conv._id)}
                      onStartEdit={() => startEdit(conv)}
                      onCommitEdit={commitEdit}
                      onPin={() => onPin(conv._id, !conv.pinned)}
                      onDelete={() => onDelete(conv._id)}
                      onOpenMoveMenu={(conv, rect) => setMoveMenuState({ conv, anchorRect: rect })}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
          {conversations.length === 0 && messageResults.length === 0 && (
            <p className="text-center text-xs opacity-40 py-6">{t("sidebar.empty")}</p>
          )}
        </div>

        <div className="chat-sidebar-footer p-3 shrink-0 border-t border-edge-light dark:border-edge-dark space-y-2">
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="workspace-route-button workspace-route-button--admin"
            >
              <span className="workspace-route-icon" aria-hidden="true">
                <ShieldCheck size={19} strokeWidth={1.8} />
              </span>
              <span className="workspace-route-label">{t("sidebar.admin")}</span>
              <ArrowUpRight size={17} className="workspace-route-arrow" aria-hidden="true" />
            </button>
          )}

          {canInstall && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 transition-all shadow-xs"
            >
              <Download size={15} className="shrink-0 text-brand-600 dark:text-brand-400" />
              <span className="flex-1 text-start">Cài đặt ứng dụng Chat AI</span>
            </button>
          )}
          <SidebarQuota />
          <div className="flex items-center gap-1.5 px-3 py-2">
            <Tooltip label={t("profile.title")} side="top" align="start">
              <button
                onClick={() => setProfileOpen(true)}
                className="relative inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-ion-500/50"
              >
                <UserAvatar user={user} size={32} />
                {avatarBusy && (
                  <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 size={14} className="text-white animate-spin" />
                  </span>
                )}
              </button>
            </Tooltip>
            <button
              onClick={() => setProfileOpen(true)}
              className="text-sm truncate flex-1 text-start font-medium text-zinc-800 dark:text-zinc-200 hover:text-ion-600 dark:hover:text-ion-400 transition-colors"
            >
              {user?.username}
            </button>
            <Tooltip label={t("profile.title")} side="top">
              <button
                onClick={() => setProfileOpen(true)}
                aria-label={t("profile.title")}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <Settings size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t("sidebar.avatarRandom")} side="top">
              <button
                onClick={handleRandomAvatar}
                disabled={avatarBusy}
                aria-label={t("sidebar.avatarRandom")}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                {avatarBusy ? <Loader2 size={15} className="animate-spin" /> : <Dices size={15} />}
              </button>
            </Tooltip>
            <Tooltip label={t("sidebar.logout")} side="top">
              <button onClick={logout} aria-label={t("sidebar.logout")} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                <LogOut size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
        </div>

        {/* Thanh icon thu gọn (desktop) */}
        <div
          onClick={onExpand}
          className={clsx(
            "hidden md:flex absolute inset-y-0 left-0 w-14 flex-col items-center py-3 gap-1 transition-[opacity,visibility] duration-200",
            collapsed ? "opacity-100 cursor-e-resize" : "opacity-0 invisible pointer-events-none"
          )}
        >
          <RailButton
            label={t("sidebar.expand")}
            onClick={onExpand}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <BrandMark size={28} className="transition-opacity group-hover:opacity-0" />
            <PanelLeftOpen size={18} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" />
          </RailButton>
          <RailButton
            label={t("sidebar.newChat")}
            shortcut="Ctrl+Shift+O"
            wrapperClassName="mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onNew();
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <SquarePen size={18} />
          </RailButton>
          <RailButton
            label={t("sidebar.search")}
            shortcut="Ctrl+K"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
              setTimeout(() => document.getElementById("sidebar-search")?.focus({ preventScroll: true }), 60);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Search size={18} />
          </RailButton>
          <button
            data-flyout
            onMouseEnter={(e) => openFlyout("pinned", e.currentTarget)}
            onMouseLeave={scheduleClose}
            onClick={(e) => {
              e.stopPropagation();
              openFlyout("pinned", e.currentTarget);
            }}
            aria-label={t("sidebar.flyoutPinned")}
            aria-haspopup="menu"
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
              flyout?.type === "pinned" && "bg-black/5 dark:bg-white/10"
            )}
          >
            <Pin size={18} />
          </button>
          <button
            data-flyout
            onMouseEnter={(e) => openFlyout("recent", e.currentTarget)}
            onMouseLeave={scheduleClose}
            onClick={(e) => {
              e.stopPropagation();
              openFlyout("recent", e.currentTarget);
            }}
            aria-label={t("sidebar.flyoutRecent")}
            aria-haspopup="menu"
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
              flyout?.type === "recent" && "bg-black/5 dark:bg-white/10"
            )}
          >
            <MessageSquare size={18} />
          </button>

          {canInstall && (
            <RailButton
              label="Cài đặt ứng dụng"
              onClick={handleInstallClick}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
            >
              <Download size={18} />
            </RailButton>
          )}

          <SidebarQuota collapsed />
          <RailButton
            label={t("profile.title")}
            wrapperClassName="mt-auto"
            onClick={(e) => {
              e.stopPropagation();
              setProfileOpen(true);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <Settings size={18} />
          </RailButton>

          <Tooltip label={user?.username ? t("sidebar.accountTip", { name: user.username }) : t("sidebar.account")} side="right" className="inline-flex">
            <span className="relative inline-flex">
              <UserAvatar
                user={user}
                size={36}
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen(true);
                }}
                title={t("profile.title")}
              />
              {avatarBusy && (
                <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center pointer-events-none">
                  <Loader2 size={14} className="text-white animate-spin" />
                </span>
              )}
            </span>
          </Tooltip>
        </div>
      </aside>

      <RailFlyout
        flyout={flyout}
        conversations={conversations}
        activeId={activeId}
        onPick={(id) => {
          onSelect(id);
          setFlyout(null);
        }}
        onShowAll={() => {
          setFlyout(null);
          onExpand();
        }}
        onEnter={cancelClose}
        onLeave={scheduleClose}
      />

      <InstallAppModal
        open={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        isIOS={isIOS}
        onInstallNow={promptInstall}
      />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <FolderModal
        open={folderModalOpen}
        folder={editingFolder}
        onClose={() => { setFolderModalOpen(false); setEditingFolder(null); }}
        onSaved={async () => {
          await loadFolders();
          onRefreshConversations?.();
        }}
      />
      {moveMenuState && (
        <MoveFolderMenu
          conv={moveMenuState.conv}
          folders={folders}
          anchorRect={moveMenuState.anchorRect}
          onClose={() => setMoveMenuState(null)}
          onMoveFolder={handleMoveFolder}
        />
      )}
    </>
  );
}
