import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users,
  MessageSquare,
  MessagesSquare,
  ShieldBan,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Cpu,
  Activity,
  Download,
  DollarSign,
  Sliders,
  History,
  Bot,
  Megaphone,
  Trophy,
  BarChart3,
  RefreshCw,
  Server,
  HardDrive,
  Smartphone,
  Laptop,
  Radio,
  Clock,
  ShieldCheck,
  Layers,
  Database,
  Flame,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../../api/axios.js";
import { Skeleton } from "../../components/Skeleton.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import UserAvatar from "../../components/UserAvatar.jsx";

const PROVIDER_THEMES = {
  gemini: {
    name: "Google Gemini",
    color: "#8070e8",
    bg: "rgba(128, 112, 232, 0.12)",
    border: "rgba(128, 112, 232, 0.25)",
    tag: "Gemini",
  },
  groq: {
    name: "Groq Cloud",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
    tag: "Groq",
  },
  openrouter: {
    name: "OpenRouter",
    color: "#0d9488",
    bg: "rgba(13, 148, 136, 0.12)",
    border: "rgba(13, 148, 136, 0.25)",
    tag: "OpenRouter",
  },
};

const ACTION_LABELS = {
  SETTINGS_UPDATE: { label: "Cài đặt", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  USER_UPDATE: { label: "Sửa user", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  USER_SESSIONS_REVOKE: { label: "Thu hồi phiên", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  ADMIN_REVOKE_SESSION: { label: "Thu hồi phiên", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  MODEL_CREATE: { label: "Thêm model", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  MODEL_UPDATE: { label: "Cập nhật model", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  MODEL_DELETE: { label: "Xóa model", tone: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  ANNOUNCEMENT_CREATE: { label: "Thông báo", tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  PERSONA_CREATE: { label: "Trợ lý AI", tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
};

function renderLogDetails(details) {
  if (!details) return "";
  let obj = details;
  if (typeof details === "string") {
    try {
      obj = JSON.parse(details);
    } catch {
      return details;
    }
  }
  if (typeof obj === "object" && obj !== null) {
    if (obj.title) return `"${obj.title}"`;
    if (obj.username) return `User: ${obj.username}`;
    if (obj.name) return `Tên: ${obj.name}`;
    if (obj.action) return obj.action;
    const parts = Object.entries(obj)
      .filter(([k]) => !["userId", "adminId"].includes(k))
      .map(([k, v]) => `${k}: ${v}`);
    return parts.length ? parts.join(", ") : JSON.stringify(obj);
  }
  return String(details);
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const days = Math.floor(hr / 24);
  return `${days} ngày trước`;
}

function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-zinc-900/95 dark:bg-zinc-800/95 text-white shadow-xl border border-zinc-700/50 backdrop-blur-md text-xs">
      <p className="text-zinc-400 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 font-semibold">
        <span className="w-2 h-2 rounded-full bg-brand-400" />
        <span>{Number(payload[0].value).toLocaleString()} tin nhắn</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang } = useI18n();

  const [stats, setStats] = useState(null);
  const [costs, setCosts] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("costs"); // "costs" | "audit"

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, costsRes, providersRes, systemRes, sessionsRes, logsRes] = await Promise.allSettled([
        api.get("/admin/stats"),
        api.get("/admin/analytics/costs"),
        api.get("/admin/analytics/providers"),
        api.get("/admin/system/status"),
        api.get("/admin/sessions?limit=1"),
        api.get("/admin/audit-logs?limit=6"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
      } else if (!stats) {
        setLoadError(true);
      }

      if (costsRes.status === "fulfilled" && costsRes.value?.data?.success) {
        setCosts(costsRes.value.data.data);
      }
      if (providersRes.status === "fulfilled" && providersRes.value?.data?.success) {
        setProviderData(providersRes.value.data.data);
      }
      if (systemRes.status === "fulfilled" && systemRes.value?.data?.success) {
        setSystemStatus(systemRes.value.data.data);
      }
      if (sessionsRes.status === "fulfilled" && sessionsRes.value?.data?.success) {
        setSessionStats(sessionsRes.value.data.data.stats);
      }
      if (logsRes.status === "fulfilled" && logsRes.value?.data?.success) {
        setRecentLogs(logsRes.value.data.data.logs || []);
      }
    } catch {
      if (!stats) setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  const handleExportUsers = async () => {
    try {
      setExporting(true);
      const res = await api.get("/admin/analytics/export-users", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `users_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Xuất dữ liệu thất bại.");
    } finally {
      setExporting(false);
    }
  };

  const chartData = useMemo(() => {
    if (!stats?.messagesPerDay) return [];
    return stats.messagesPerDay.map((d) => ({
      date: d._id.slice(5),
      count: d.count,
    }));
  }, [stats]);

  const total7dMessages = useMemo(() => {
    if (!chartData?.length) return 0;
    return chartData.reduce((sum, item) => sum + item.count, 0);
  }, [chartData]);

  const peakDay = useMemo(() => {
    if (!chartData?.length) return null;
    return [...chartData].sort((a, b) => b.count - a.count)[0];
  }, [chartData]);

  if (loadError) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <XCircle size={22} className="shrink-0" />
          <p className="text-sm font-medium">{t("admin.dash.loadFail")}</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-800 text-xs font-semibold shadow-xs"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="lg:col-span-7 h-80 rounded-2xl" />
          <Skeleton className="lg:col-span-5 h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { totals, configuredProviders = [] } = stats;
  const ALL_PROVIDERS = ["gemini", "groq", "openrouter"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-[1600px] mx-auto pb-12"
    >
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("admin.dash.title")}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Trung tâm giám sát tài nguyên AI, hiệu năng máy chủ & người dùng thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu tức thì"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-brand-500" : ""} />
            <span>{refreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>

          <button
            onClick={handleExportUsers}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={14} className={exporting ? "animate-bounce" : ""} />
            <span>{exporting ? t("admin.dash.exporting") : t("admin.dash.exportUsersCsv")}</span>
          </button>
        </div>
      </div>

      {/* 2. SERVER & HARDWARE TELEMETRY BANNER */}
      {systemStatus && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Server Runtime */}
            <div className="flex items-center gap-3.5 p-4 sm:px-5 sm:py-3.5 border-b sm:border-b sm:border-r lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                <Server size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Node & Runtime</p>
                <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate font-mono">
                  {systemStatus.server?.nodeVersion} • {systemStatus.server?.platform}
                </p>
                <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                  <Clock size={11} className="inline text-emerald-500" /> Uptime: {systemStatus.server?.formattedUptime}
                </p>
              </div>
            </div>

            {/* 2. Heap Memory */}
            <div className="flex items-center gap-3.5 p-4 sm:px-5 sm:py-3.5 border-b sm:border-b sm:border-r-0 lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                <Cpu size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-zinc-400 uppercase tracking-wider">Node Heap</span>
                  <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {systemStatus.memory?.heapUsedMB} MB
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((systemStatus.memory?.heapUsedMB || 1) / (systemStatus.memory?.heapTotalMB || 100)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Giới hạn: {systemStatus.memory?.heapTotalMB} MB cấp phát</p>
              </div>
            </div>

            {/* 3. System RAM */}
            <div className="flex items-center gap-3.5 p-4 sm:px-5 sm:py-3.5 border-b sm:border-b-0 sm:border-r lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <HardDrive size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-zinc-400 uppercase tracking-wider">Hệ Thống RAM</span>
                  <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {systemStatus.memory?.systemUsedPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${systemStatus.memory?.systemUsedPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Còn trống {(systemStatus.memory?.systemFreeMemMB / 1024).toFixed(1)} GB /{" "}
                  {(systemStatus.memory?.systemTotalMemMB / 1024).toFixed(1)} GB
                </p>
              </div>
            </div>

            {/* 4. Database & Catalog */}
            <div className="flex items-center gap-3.5 p-4 sm:px-5 sm:py-3.5 border-none border-zinc-200/80 dark:border-zinc-800">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <Database size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Cơ sở dữ liệu</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    MSSQL Kết nối
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {systemStatus.database?.totalModels} mô hình • {systemStatus.database?.totalAnnouncements} thông báo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXECUTIVE 4-KPI TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("admin.dash.totalUsers")}</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1.5 font-mono">
                {totals.totalUsers.toLocaleString(lang)}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 size={12} /> {totals.activeUsers} {t("admin.dash.activeUsers")}
            </span>
            <span className="text-zinc-400 text-[11px]">
              {totals.bannedUsers > 0 ? `${totals.bannedUsers} ${t("admin.dash.bannedUsers")}` : "0 khóa"}
            </span>
          </div>
        </div>

        {/* Messages & Conversations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("admin.dash.messages")}</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1.5 font-mono">
                {totals.totalMessages.toLocaleString(lang)}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px]">
              <MessagesSquare size={12} /> {totals.totalConversations} {t("admin.dash.conversations")}
            </span>
            <span className="text-zinc-400 text-[11px]">
              ~{(totals.totalMessages / (totals.totalConversations || 1)).toFixed(1)} tin/hội thoại
            </span>
          </div>
        </div>

        {/* Active Sessions & Devices */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Phiên & Thiết Bị Mở</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1.5 font-mono">
                {sessionStats ? sessionStats.totalActive.toLocaleString(lang) : "..."}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Smartphone size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            {sessionStats ? (
              <>
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                  <Laptop size={12} /> {sessionStats.desktopCount} PC • <Smartphone size={12} />{" "}
                  {sessionStats.mobileCount + sessionStats.tabletCount} Mobile
                </span>
                <Link
                  to="/admin/sessions"
                  className="text-brand-600 dark:text-brand-400 hover:underline text-[11px] font-semibold"
                >
                  Quản lý →
                </Link>
              </>
            ) : (
              <span className="text-zinc-400 text-[11px]">Đang kiểm tra...</span>
            )}
          </div>
        </div>

        {/* Cost & Tokens */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("admin.dash.estimatedCost")}</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight mt-1.5 font-mono">
                ${costs ? costs.totalCostUSD.toFixed(3) : "0.000"}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-700 dark:text-zinc-300 font-mono font-medium text-[11px]">
              {costs ? costs.totalTokens.toLocaleString(lang) : "0"} tokens
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">30 ngày qua</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN ANALYTICS CENTERPIECE: AREA CHART & AI PROVIDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Message Volume Area Chart (7 Columns) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity size={16} className="text-brand-500" />
                  {t("admin.dash.perDay")}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Biểu đồ lưu lượng tương tác giữa người dùng và các mô hình AI</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold">
                  Tổng {total7dMessages.toLocaleString()} tin
                </span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-xs">
                <Activity size={32} strokeWidth={1.5} className="mb-2 text-zinc-300 dark:text-zinc-600" />
                <p>{t("admin.dash.noMessages")}</p>
              </div>
            ) : (
              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="msgAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8070e8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8070e8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa" }}
                      dy={8}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa" }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<AreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8070e8"
                      strokeWidth={2.5}
                      fill="url(#msgAreaGradient)"
                      activeDot={{ r: 5, stroke: "#8070e8", strokeWidth: 2, fill: "#ffffff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Mini Chart Footer Telemetry */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-500" />
              Ngày đỉnh điểm:{" "}
              <strong className="text-zinc-700 dark:text-zinc-200">
                {peakDay ? `${peakDay.date} (${peakDay.count} tin)` : "Chưa có"}
              </strong>
            </span>
            <span className="text-[11px] text-zinc-400">
              TB: ~{Math.round(total7dMessages / 7)} tin/ngày
            </span>
          </div>
        </div>

        {/* Right: AI Providers Status & Token Share (5 Columns) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Cpu size={16} className="text-violet-500" />
                  {t("admin.dash.providers")}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Trạng thái kết nối API & tiêu thụ Token</p>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {configuredProviders.length}/{ALL_PROVIDERS.length} sẵn sàng
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {ALL_PROVIDERS.map((providerKey) => {
                const theme = PROVIDER_THEMES[providerKey] || {
                  name: providerKey,
                  color: "#8070e8",
                  bg: "rgba(128, 112, 232, 0.12)",
                };
                const isConfigured = configuredProviders.includes(providerKey);
                const statItem = providerData?.providerStats?.find(
                  (p) => p.provider?.toLowerCase() === providerKey.toLowerCase()
                );
                const totalAllTokens =
                  providerData?.providerStats?.reduce((acc, curr) => acc + curr.totalTokens, 0) || 1;
                const tokens = statItem?.totalTokens || 0;
                const requests = statItem?.requestCount || 0;
                const pct = Math.round((tokens / totalAllTokens) * 100);

                return (
                  <div
                    key={providerKey}
                    className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: theme.bg, color: theme.color }}
                        >
                          {providerKey[0].toUpperCase()}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {theme.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {requests.toLocaleString()} yêu cầu
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isConfigured
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {isConfigured ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {isConfigured ? "Đã kết nối" : "Chưa có key"}
                        </span>
                        <p className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                          {tokens.toLocaleString()} <span className="text-[10px] text-zinc-400">({pct}%)</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: theme.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 mt-4 leading-relaxed">
            💡 Thêm hoặc đổi API key trong file <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">.env</code> backend để mở rộng thêm nhà cung cấp AI.
          </p>
        </div>
      </div>

      {/* 5. LOWER SPLIT SECTION: TOP POWER USERS & COSTS/AUDIT TAB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Top Power Users Leaderboard (6 Columns) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  {t("admin.dash.topUsersTitle")}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Người dùng tạo nhiều lượt yêu cầu và tiêu thụ token nhất</p>
              </div>
              <Link
                to="/admin/users"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                Xem tất cả <ArrowUpRight size={13} />
              </Link>
            </div>

            {!providerData?.topUsers || providerData.topUsers.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-zinc-400 text-xs">
                <Users size={28} className="mb-2 text-zinc-300 dark:text-zinc-600" />
                <p>{t("admin.dash.noUsersChat")}</p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {providerData.topUsers.slice(0, 5).map((u, idx) => {
                  const maxTokens = providerData.topUsers[0]?.totalTokens || 1;
                  const ratio = Math.min(100, Math.round((u.totalTokens / maxTokens) * 100));

                  return (
                    <div key={u.userId} className="py-2.5 flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div className="w-6 text-center font-bold text-xs shrink-0">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </div>

                        {/* Avatar */}
                        <UserAvatar user={u} size={32} className="shrink-0" />

                        {/* Name & Email */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {u.username}
                            </span>
                            <span className="uppercase text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {u.userTier || "free"}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Token Metric & Mini Bar */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">
                          {u.totalTokens.toLocaleString(lang)} tokens
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <span className="text-[10px] text-zinc-400 font-mono">{u.requestCount} requests</span>
                          <div className="w-12 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Dựa trên dữ liệu TokenUsage thực tế</span>
            <span>Cập nhật liên tục</span>
          </div>
        </div>

        {/* Right: Tabbed Costs & Recent Audit Logs (6 Columns) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            {/* Tab Controls */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("costs")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "costs"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Chi phí theo Mô hình
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "audit"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Nhật ký Quản trị
                </button>
              </div>

              {activeTab === "costs" ? (
                <span className="text-xs font-mono text-zinc-500">
                  {costs?.breakdown?.length || 0} mô hình
                </span>
              ) : (
                <Link
                  to="/admin/audit-logs"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                >
                  Tất cả logs <ArrowUpRight size={13} />
                </Link>
              )}
            </div>

            {/* TAB 1: MODEL COSTS BREAKDOWN */}
            {activeTab === "costs" && (
              <div className="mt-3">
                {!costs?.breakdown || costs.breakdown.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-zinc-400 text-xs">
                    <DollarSign size={28} className="mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p>Chưa có dữ liệu tiêu thụ chi phí.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                        <tr>
                          <th className="py-2 px-2">Mô hình AI</th>
                          <th className="py-2 px-2">Yêu cầu</th>
                          <th className="py-2 px-2">Tổng Tokens</th>
                          <th className="py-2 px-2 text-end">Chi phí (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-mono">
                        {costs.breakdown.map((b, i) => (
                          <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                            <td className="py-2 px-2">
                              <span className="font-semibold block font-sans text-zinc-900 dark:text-zinc-100">
                                {b.modelId}
                              </span>
                              <span className="text-[10px] text-zinc-400 uppercase">{b.provider}</span>
                            </td>
                            <td className="py-2 px-2">{b.requestCount.toLocaleString()}</td>
                            <td className="py-2 px-2">{b.totalTokens.toLocaleString()}</td>
                            <td className="py-2 px-2 text-end font-semibold text-emerald-600 dark:text-emerald-400">
                              ${b.estimatedCostUSD}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RECENT AUDIT LOGS FEED */}
            {activeTab === "audit" && (
              <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
                {recentLogs.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-zinc-400 text-xs">
                    <History size={28} className="mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p>Chưa có nhật ký hoạt động nào.</p>
                  </div>
                ) : (
                  recentLogs.map((log) => {
                    const badge = ACTION_LABELS[log.action] || {
                      label: log.action,
                      tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200",
                    };
                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.tone} shrink-0`}>
                            {badge.label}
                          </span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {log.adminUsername}
                          </span>
                          <span className="text-zinc-400 truncate text-[11px]">
                            {renderLogDetails(log.details)}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 shrink-0 font-mono">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Dữ liệu tính toán tự động</span>
            <span className="font-mono">Chu kỳ 30 ngày</span>
          </div>
        </div>
      </div>

      {/* 6. QUICK COMMAND & SHORTCUT NAVIGATION GRID */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders size={16} className="text-brand-500" />
              {t("admin.dash.quick")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Truy cập tức thì tới các phân hệ điều hành quan trọng</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/admin/settings"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit group-hover:scale-110 transition-transform">
              <Sliders size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Cài đặt & AI Ping
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Keys, bảo trì, mạng</p>
            </div>
          </Link>

          <Link
            to="/admin/sessions"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 w-fit group-hover:scale-110 transition-transform">
              <Smartphone size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Thiết bị & Phiên
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Quản lý active session</p>
            </div>
          </Link>

          <Link
            to="/admin/models"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 w-fit group-hover:scale-110 transition-transform">
              <Cpu size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Mô hình AI
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Bật/tắt, giá token</p>
            </div>
          </Link>

          <Link
            to="/admin/personas"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 w-fit group-hover:scale-110 transition-transform">
              <Bot size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Trợ lý AI
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Personas công khai</p>
            </div>
          </Link>

          <Link
            to="/admin/announcements"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit group-hover:scale-110 transition-transform">
              <Megaphone size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Thông báo Hệ thống
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Broadcast banner</p>
            </div>
          </Link>

          <Link
            to="/admin/audit-logs"
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit group-hover:scale-110 transition-transform">
              <History size={18} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Nhật ký Hoạt động
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Audit log admin</p>
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
