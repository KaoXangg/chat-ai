import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  X,
  User,
  Lock,
  Sparkles,
  Dices,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  Mail,
  Bot,
  Download,
  CheckCircle2,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  LogOut,
  Clock,
  ShieldCheck,
  Palette,
  Sun,
  Moon,
  Zap,
  Crown,
  ChevronRight,
  Info,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import UserAvatar from "./UserAvatar.jsx";
import BrandMark from "./BrandMark.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { usePWAInstall } from "../hooks/usePWAInstall.js";
import InstallAppModal from "./InstallAppModal.jsx";

const NAV_GROUPS = [
  {
    title: "CÀI ĐẶT CHUNG",
    items: [
      { id: "account", labelKey: "profile.tabAccount", icon: User },
      { id: "appearance", labelKey: "profile.tabAppearance", icon: Palette },
      { id: "prompt", labelKey: "profile.tabInstructions", icon: Bot },
    ],
  },
  {
    title: "BẢO MẬT & THIẾT BỊ",
    items: [
      { id: "sessions", labelKey: "profile.tabSessions", icon: Smartphone },
      { id: "security", labelKey: "profile.tabSecurity", icon: Lock },
    ],
  },
  {
    title: "ỨNG DỤNG",
    items: [
      { id: "app", labelKey: "profile.tabApp", icon: Download },
    ],
  },
];

const PROMPT_TEMPLATES = [
  {
    title: "Lập trình viên Senior",
    text: "Bạn là một Senior Fullstack Software Engineer. Trả lời trực diện, chuẩn xác, ưu tiên code mẫu sạch (clean code) kèm giải thích ngắn gọn trọng tâm.",
  },
  {
    title: "Ngắn gọn & Súc tích",
    text: "Hãy trả lời cực kỳ ngắn gọn, đi thẳng vào bản chất vấn đề, không mở bài hay kết bài dài dòng.",
  },
  {
    title: "Gia sư học tập",
    text: "Hãy giải thích như một gia sư thân thiện, sử dụng phương pháp gợi mở, chia nhỏ từng bước dễ hiểu cho người mới bắt đầu.",
  },
];

export default function ProfileModal({ open, onClose }) {
  const { user, setUser, randomizeAvatar, getSessions, revokeSession, revokeAllOtherSessions } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("account");
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setInstallModalOpen(true);
      return;
    }
    const res = await promptInstall();
    if (res === "unavailable" || res === "ios_guide") {
      setInstallModalOpen(true);
    }
  };

  // Tab Account states
  const [username, setUsername] = useState(user?.username || "");
  const [savingAccount, setSavingAccount] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Tab System Prompt states
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Tab Sessions states
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === "sessions") {
      loadSessions();
    }
  }, [open, activeTab]);

  const handleRevokeSession = async (sessionId) => {
    if (revokingId) return;
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      toast.success(t("profile.sessionRevokedSuccess"));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t("error.GENERIC"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (revokingAll) return;
    if (!window.confirm(t("profile.logoutAllConfirmTitle"))) return;
    setRevokingAll(true);
    try {
      await revokeAllOtherSessions();
      toast.success(t("profile.allSessionsRevokedSuccess"));
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t("error.GENERIC"));
    } finally {
      setRevokingAll(false);
    }
  };

  // Tab Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (open && user) {
      setUsername(user.username || "");
      setPromptLoading(true);
      api
        .get("/preferences")
        .then((res) => {
          if (res.data.success && res.data.data.systemPrompt !== undefined) {
            setSystemPrompt(res.data.data.systemPrompt || "");
          }
        })
        .catch(() => {})
        .finally(() => setPromptLoading(false));
    }
  }, [open, user]);

  if (!open) return null;

  const handleRandomizeAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      await randomizeAvatar();
      toast.success(t("profile.savedSuccess"));
    } catch {
      toast.error(t("error.GENERIC"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.warning(t("profile.usernamePlaceholder"));
      return;
    }
    setSavingAccount(true);
    try {
      const res = await api.patch("/auth/me", { username: username.trim() });
      if (res.data.success) {
        setUser(res.data.data.user);
        toast.success(t("profile.savedSuccess"));
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t("error.GENERIC"));
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    setSavingPrompt(true);
    try {
      const res = await api.patch("/preferences", { systemPrompt: systemPrompt.trim() });
      if (res.data.success) {
        toast.success(t("profile.savedPromptSuccess"));
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t("error.GENERIC"));
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.warning(t("profile.currentPasswordPlaceholder"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("profile.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.passwordMismatch"));
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        toast.success(t("profile.passwordChangedSuccess"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t("error.GENERIC"));
    } finally {
      setChangingPass(false);
    }
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const userTier = user?.userTier || "free";
  const quota = user?.customDailyTokenLimit;

  // Flatten all tabs to find active title
  const allTabs = NAV_GROUPS.flatMap((g) => g.items);
  const activeTabMeta = allTabs.find((t) => t.id === activeTab) || allTabs[0];
  const ActiveIcon = activeTabMeta.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
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
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", duration: 0.28, damping: 25 }}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px] max-h-[90vh]"
        >
          {/* ================= LEFT SIDEBAR ================= */}
          <div className="w-full md:w-64 bg-zinc-50/80 dark:bg-zinc-950/40 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0">
            {/* User Mini Profile Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200/70 dark:border-zinc-800/80 flex items-center gap-3">
              <div className="relative group">
                <UserAvatar user={user} size={42} className="ring-2 ring-white dark:ring-zinc-800 shadow-sm" />
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  disabled={avatarBusy}
                  title={t("profile.randomAvatar")}
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-zinc-800 text-ion-600 dark:text-ion-400 border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform shadow-xs"
                >
                  {avatarBusy ? <Loader2 size={10} className="animate-spin" /> : <Dices size={10} />}
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {user?.username}
                  </h3>
                  {userTier === "vip" ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                      <Crown size={9} /> VIP
                    </span>
                  ) : userTier === "pro" ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-0.5">
                      <Zap size={9} /> PRO
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex md:flex-col p-2.5 sm:p-3 overflow-x-auto md:overflow-y-auto flex-1 gap-1 md:gap-4 scrollbar-none">
              {NAV_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1 shrink-0 md:shrink">
                  <span className="hidden md:block px-3 py-1 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                    {group.title}
                  </span>
                  <div className="flex md:flex-col gap-1">
                    {group.items.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={clsx(
                            "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-start",
                            isSelected
                              ? "bg-ion-600 text-white shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                          )}
                        >
                          <Icon size={16} className={clsx(isSelected ? "text-white" : "text-zinc-400")} />
                          <span className="truncate">{t(tab.labelKey)}</span>
                          {tab.id === "sessions" && sessions.length > 1 && (
                            <span className={clsx(
                              "ml-auto hidden md:inline-block px-1.5 py-0.2 rounded-full text-[10px]",
                              isSelected ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            )}>
                              {sessions.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Left Sidebar Footer */}
            <div className="hidden md:flex p-3.5 border-t border-zinc-200/70 dark:border-zinc-800/80 items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <BrandMark size={16} />
                <span>Chat AI Suite</span>
              </span>
              <span className="font-mono text-[10px] opacity-75">v2.5</span>
            </div>
          </div>

          {/* ================= RIGHT CONTENT AREA ================= */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-ion-500/10 text-ion-600 dark:text-ion-400">
                  <ActiveIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {t(activeTabMeta.labelKey)}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* ================= TAB 1: ACCOUNT ================= */}
              {activeTab === "account" && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar & Badges Hero Card */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="relative group shrink-0">
                      <UserAvatar user={user} size={84} className="ring-4 ring-white dark:ring-zinc-800 shadow-md" />
                      {avatarBusy && (
                        <span className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <Loader2 size={24} className="text-white animate-spin" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-start space-y-2">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {user?.username}
                        </h3>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-semibold capitalize",
                          user?.role === "admin"
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                            : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"
                        )}>
                          {user?.role === "admin" ? "Quản trị viên (Admin)" : "Người dùng (User)"}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t("profile.randomAvatarTip")}
                      </p>

                      <button
                        type="button"
                        onClick={handleRandomizeAvatar}
                        disabled={avatarBusy}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all shadow-xs disabled:opacity-50"
                      >
                        {avatarBusy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Dices size={13} className="text-ion-500" />
                        )}
                        <span>{t("profile.randomAvatar")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tier & Quota Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span className="text-[11px] font-medium text-zinc-400 block">{t("profile.tierLabel")}</span>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase mt-0.5">
                        {userTier}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span className="text-[11px] font-medium text-zinc-400 block">{t("profile.quotaLabel")}</span>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                        {quota === 0 ? t("profile.unlimited") : quota ? t("profile.tokensPerDay", { n: quota.toLocaleString() }).replace("{n}", quota.toLocaleString()) : t("profile.unlimited")}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span className="text-[11px] font-medium text-zinc-400 block">{t("profile.joinedAt")}</span>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                        {joinedDate || "Gần đây"}
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {t("profile.username")}
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t("profile.usernamePlaceholder")}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Mail size={13} className="text-zinc-400" />
                        {t("profile.email")}
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" title="Đã xác thực">
                          <CheckCircle2 size={16} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingAccount}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ion-600 hover:bg-ion-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {savingAccount ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      <span>{t("profile.save")}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ================= TAB 2: APPEARANCE & PREFERENCES ================= */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  {/* Theme Mode Selector */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {t("profile.themeTitle")}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {t("profile.themeDesc")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Light Card */}
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={clsx(
                          "p-4 rounded-2xl border-2 text-start transition-all space-y-3 relative group",
                          theme === "light"
                            ? "border-ion-500 bg-ion-500/5 ring-2 ring-ion-500/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40"
                        )}
                      >
                        <div className="h-20 w-full rounded-xl bg-white border border-zinc-200 p-2 flex flex-col justify-between shadow-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-3/4 h-2 bg-zinc-200 rounded" />
                            <div className="w-1/2 h-2 bg-zinc-100 rounded" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sun size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {t("profile.themeLight")}
                            </span>
                          </div>
                          {theme === "light" && (
                            <span className="w-5 h-5 rounded-full bg-ion-600 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Dark Card */}
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={clsx(
                          "p-4 rounded-2xl border-2 text-start transition-all space-y-3 relative group",
                          theme === "dark"
                            ? "border-ion-500 bg-ion-500/5 ring-2 ring-ion-500/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40"
                        )}
                      >
                        <div className="h-20 w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2 flex flex-col justify-between shadow-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-3/4 h-2 bg-zinc-800 rounded" />
                            <div className="w-1/2 h-2 bg-zinc-900 rounded" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Moon size={16} className="text-brand-400" />
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {t("profile.themeDark")}
                            </span>
                          </div>
                          {theme === "dark" && (
                            <span className="w-5 h-5 rounded-full bg-ion-600 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Languages Section */}
                  <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {t("profile.langTitle")}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {t("profile.langDesc")}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          <Globe size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Ngôn ngữ giao diện & AI phản hồi
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Thay đổi linh hoạt giữa Tiếng Việt, English và hơn 50 ngôn ngữ.
                          </p>
                        </div>
                      </div>

                      <LanguageSwitcher mode="full" align="end" />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: PROMPT ================= */}
              {activeTab === "prompt" && (
                <form onSubmit={handleSavePrompt} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Bot size={16} className="text-ion-500" />
                      {t("profile.systemPromptLabel")}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {t("profile.systemPromptHint")}
                    </p>
                  </div>

                  {promptLoading ? (
                    <div className="py-12 flex justify-center text-zinc-400">
                      <Loader2 size={24} className="animate-spin text-ion-500" />
                    </div>
                  ) : (
                    <>
                      <textarea
                        rows={5}
                        maxLength={2000}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder={t("profile.systemPromptPlaceholder")}
                        className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all resize-y leading-relaxed"
                      />

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{systemPrompt.length}/2000 ký tự</span>
                        {systemPrompt && (
                          <button
                            type="button"
                            onClick={() => setSystemPrompt("")}
                            className="hover:text-red-500 transition-colors"
                          >
                            Xóa trắng
                          </button>
                        )}
                      </div>

                      {/* Gợi ý mẫu nhanh */}
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          Chọn mẫu gợi ý nhanh:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {PROMPT_TEMPLATES.map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSystemPrompt(tpl.text)}
                              className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs space-y-1"
                            >
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                                {tpl.title}
                              </span>
                              <span className="text-zinc-500 dark:text-zinc-400 line-clamp-2 text-[11px]">
                                {tpl.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          disabled={savingPrompt}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ion-600 hover:bg-ion-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                          {savingPrompt ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Check size={15} />
                          )}
                          <span>{t("profile.save")}</span>
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* ================= TAB 4: SESSIONS ================= */}
              {activeTab === "sessions" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Smartphone size={16} className="text-ion-500" />
                        {t("profile.sessionsTitle")}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {t("profile.sessionsDesc")}
                      </p>
                    </div>
                    {sessions.some((s) => !s.isCurrent) && (
                      <button
                        type="button"
                        onClick={handleRevokeAllOthers}
                        disabled={revokingAll}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 transition-all disabled:opacity-50"
                      >
                        {revokingAll ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <LogOut size={13} />
                        )}
                        <span>{t("profile.logoutAllOthers")}</span>
                      </button>
                    )}
                  </div>

                  {sessionsLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <Loader2 size={24} className="animate-spin text-ion-500" />
                      <span className="text-xs">Đang tải danh sách thiết bị...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          {t("profile.noSessions")}
                        </div>
                      ) : (
                        sessions.map((sess) => {
                          const isCurrent = sess.isCurrent;
                          const isMobile = sess.deviceType === "mobile";
                          const isTablet = sess.deviceType === "tablet";
                          const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

                          let activityText = t("profile.activeNow");
                          if (!isCurrent && sess.lastActiveAt) {
                            const diff = Date.now() - new Date(sess.lastActiveAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 2) activityText = "Vừa mới đây";
                            else if (mins < 60) activityText = `${mins} phút trước`;
                            else if (mins < 1440) activityText = `${Math.floor(mins / 60)} giờ trước`;
                            else activityText = `${Math.floor(mins / 1440)} ngày trước`;
                          }

                          return (
                            <div
                              key={sess.id}
                              className={clsx(
                                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all",
                                isCurrent
                                  ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/25 ring-1 ring-emerald-500/20"
                                  : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              )}
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div
                                  className={clsx(
                                    "p-2.5 rounded-xl shrink-0 mt-0.5",
                                    isCurrent
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"
                                  )}
                                >
                                  <DeviceIcon size={20} />
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                      {sess.os || "Hệ điều hành"} · {sess.browser || "Trình duyệt"}
                                    </span>
                                    {isCurrent && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {t("profile.currentDevice")}
                                      </span>
                                    )}
                                    {sess.rememberMe && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ion-500/10 text-ion-600 dark:text-ion-400 border border-ion-500/20">
                                        Ghi nhớ 30 ngày
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Globe size={11} className="text-zinc-400" />
                                      <span>{sess.ipAddress || "127.0.0.1"}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={11} className="text-zinc-400" />
                                      <span>{activityText}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end shrink-0 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60 dark:border-zinc-800">
                                {isCurrent ? (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1">
                                    Đang sử dụng
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSession(sess.id)}
                                    disabled={revokingId === sess.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 transition-all disabled:opacity-50"
                                  >
                                    {revokingId === sess.id ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <LogOut size={13} />
                                    )}
                                    <span>{t("profile.logoutThisDevice")}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 5: SECURITY ================= */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Password Change Form */}
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {t("profile.changePassword")}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Cập nhật mật khẩu định kỳ để nâng cao bảo mật cho tài khoản của bạn.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {t("profile.currentPassword")}
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder={t("profile.currentPasswordPlaceholder")}
                          className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {t("profile.newPassword")}
                        </label>
                        <div className="relative">
                          <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("profile.newPasswordPlaceholder")}
                            className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {t("profile.confirmPassword")}
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("profile.confirmPasswordPlaceholder")}
                            className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPass}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ion-600 hover:bg-ion-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        {changingPass ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Lock size={15} />
                        )}
                        <span>{t("profile.changePassword")}</span>
                      </button>
                    </div>
                  </form>

                  {/* 2FA Protection Info Card */}
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Xác thực hai bước (2FA) bảo mật cao
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Tài khoản Quản trị viên (Admin) được kích hoạt cơ chế mã OTP gửi qua Email tự động khi đăng nhập, ngăn chặn triệt để hành vi truy cập trái phép.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 6: PWA APP ================= */}
              {activeTab === "app" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Ứng dụng Chat AI (PWA Standalone)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Cài đặt trực tiếp lên Windows, Mac, iOS hoặc Android để sử dụng mượt mà không thanh địa chỉ.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-brand-500/25 bg-brand-500/5 dark:bg-brand-500/10 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 rounded-2xl bg-brand-500/20 text-brand-600 dark:text-brand-400 shrink-0">
                        <Download size={26} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {isInstalled ? "Ứng dụng đã được cài đặt" : "Cài đặt Chat AI lên thiết bị"}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {isInstalled
                            ? "Bạn đang sử dụng ứng dụng Chat AI ở chế độ PWA chuyên biệt."
                            : "Trải nghiệm tốc độ tải trang tức thì, hỗ trợ phím tắt và chạy toàn màn hình."}
                        </p>
                      </div>
                    </div>

                    {!isInstalled && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleInstallClick}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg"
                        >
                          <Download size={15} />
                          <span>Cài đặt ứng dụng ngay</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" /> Tốc độ phản hồi tức thì
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Bộ nhớ đệm Service Worker lưu sẵn tài nguyên giao diện, mở app tức thì.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-violet-500" /> Trải nghiệm toàn màn hình
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Loại bỏ thanh địa chỉ trình duyệt, cảm giác như ứng dụng Native trên máy tính và điện thoại.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <InstallAppModal
        open={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        isIOS={isIOS}
        onInstallNow={promptInstall}
      />
    </AnimatePresence>,
    document.body
  );
}
