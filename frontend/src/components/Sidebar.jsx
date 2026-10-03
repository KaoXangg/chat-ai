import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pin, Pencil, Trash2, Sun, Moon, LogOut, ShieldCheck, X, Check, PanelLeftClose, PanelLeftOpen, SquarePen, MessageSquare, Dices, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import BrandMark from "./BrandMark.jsx";
import Tooltip from "./Tooltip.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

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

function ConversationRow({ conv, isActive, isEditing, editValue, onEditValueChange, onSelect, onStartEdit, onCommitEdit, onPin, onDelete }) {
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
        <motion.span layoutId="active-rail" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gradient-to-b from-brand-400 to-ion-400" />
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
          className="flex-1 bg-transparent outline-none border-b border-brand-400"
        />
      ) : (
        <span className="flex-1 truncate">{isDefaultTitle(conv.title) ? t("sidebar.newChat") : conv.title}</span>
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
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
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
  isOpen,
  onCloseMobile,
  collapsed = false,
  onCollapse,
  onExpand,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, randomizeAvatar } = useAuth();
  const { t, errorMessage } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Popover của thanh icon thu gọn (đã ghim / gần đây)
  const [flyout, setFlyout] = useState(null);
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

  const groups = useMemo(() => groupByDate(conversations), [conversations]);

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          "fixed md:relative inset-y-0 left-0 z-40 w-72 shrink-0 glass border-r border-edge-light dark:border-edge-dark overflow-hidden transition-[transform,width] duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-72"
        )}
      >
        <div
          className={clsx(
            "flex flex-col h-full w-72 shrink-0 transition-[opacity,visibility] duration-200",
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
            className="w-full flex items-center gap-2 justify-center px-3 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-glow text-white text-sm font-medium transition-shadow"
          >
            <Plus size={16} /> {t("sidebar.newChat")}
          </motion.button>
</Tooltip>
        </div>

        <div className="px-3 mt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus-within:border-brand-400/60 transition-colors">
            <Search size={14} className="opacity-50" />
            <label htmlFor="sidebar-search" className="sr-only">
              {t("sidebar.searchLabel")}
            </label>
            <input
              id="sidebar-search"
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t("sidebar.searchPlaceholder")}
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-black/40 dark:placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 px-2 space-y-3">
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
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
          {conversations.length === 0 && <p className="text-center text-xs opacity-40 py-6">{t("sidebar.empty")}</p>}
        </div>

        <div className="p-3 border-t border-edge-light dark:border-edge-dark space-y-1">
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ShieldCheck size={16} className="text-brand-500" /> {t("sidebar.admin")}
            </button>
          )}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("sidebar.toLight") : t("sidebar.toDark")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}
          </button>
          <div className="flex items-center gap-2 px-3 py-2">
            <Tooltip label={t("sidebar.avatarTip")} side="top" align="start">
              <span className="relative inline-flex">
                <UserAvatar user={user} size={32} onClick={handleRandomAvatar} title={t("sidebar.avatarRandom")} />
                {avatarBusy && (
                  <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 size={14} className="text-white animate-spin" />
                  </span>
                )}
              </span>
            </Tooltip>
            <span className="text-sm truncate flex-1">{user?.username}</span>
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

          <Tooltip label={user?.username ? t("sidebar.accountTip", { name: user.username }) : t("sidebar.account")} side="right" className="mt-auto inline-flex">
            <span className="relative inline-flex">
              <UserAvatar
                user={user}
                size={36}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRandomAvatar(e);
                }}
                title={t("sidebar.avatarRandom")}
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
    </>
  );
}