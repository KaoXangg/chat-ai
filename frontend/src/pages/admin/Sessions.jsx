import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Smartphone,
  Laptop,
  Tablet,
  Search,
  Loader2,
  RefreshCw,
  LogOut,
  Globe,
  Clock,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Filter,
} from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import UserAvatar from "../../components/UserAvatar.jsx";
import clsx from "clsx";

export default function AdminSessions() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    mobileCount: 0,
    desktopCount: 0,
    tabletCount: 0,
    active24hCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingUser, setRevokingUser] = useState(null);

  const loadSessions = async (search = searchTerm, deviceType = selectedType) => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (deviceType !== "all") params.deviceType = deviceType;

      const res = await api.get("/admin/sessions", { params });
      if (res.data.success) {
        setSessions(res.data.data.sessions || []);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Không thể tải danh sách phiên đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(searchTerm, selectedType);
  }, [selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ search: searchTerm.trim() });
    } else {
      setSearchParams({});
    }
    loadSessions(searchTerm, selectedType);
  };

  const handleRevokeSession = async (sessionId, username) => {
    if (revokingId) return;
    if (!window.confirm(`Bạn có chắc muốn đăng xuất thiết bị này của ${username || "người dùng"}?`)) return;

    setRevokingId(sessionId);
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      toast.success("Đã đăng xuất thiết bị thành công!");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setStats((prev) => ({
        ...prev,
        totalActive: Math.max(0, prev.totalActive - 1),
      }));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Không thể thu hồi phiên đăng nhập.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllUserSessions = async (userId, username) => {
    if (revokingUser) return;
    if (!window.confirm(`Bạn có chắc muốn đăng xuất ${username || "người dùng này"} khỏi TẤT CẢ các thiết bị?`)) return;

    setRevokingUser(userId);
    try {
      await api.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success(`Đã đăng xuất ${username || "người dùng"} khỏi mọi thiết bị!`);
      setSessions((prev) => prev.filter((s) => s.userId !== userId));
      loadSessions(searchTerm, selectedType);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Lỗi khi thu hồi phiên người dùng.");
    } finally {
      setRevokingUser(null);
    }
  };

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return "Vừa xong";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "Vừa mới đây";
    if (mins < 60) return `${mins} phút trước`;
    if (mins < 1440) return `${Math.floor(mins / 60)} giờ trước`;
    return `${Math.floor(mins / 1440)} ngày trước`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Smartphone className="text-ion-500" size={24} />
            Quản lý Thiết bị & Phiên đăng nhập
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Theo dõi danh sách các thiết bị, trình duyệt và địa chỉ IP đang hoạt động trên hệ thống.
          </p>
        </div>

        <button
          onClick={() => loadSessions(searchTerm, selectedType)}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={clsx(loading && "animate-spin text-ion-500")} />
          Làm mới
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng phiên mở</span>
            <div className="p-2 rounded-xl bg-ion-500/10 text-ion-600 dark:text-ion-400">
              <Globe size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {stats.totalActive.toLocaleString(lang)}
          </p>
          <span className="text-[11px] text-zinc-400">Đang duy trì kết nối</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Máy tính (Desktop)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Laptop size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {stats.desktopCount.toLocaleString(lang)}
          </p>
          <span className="text-[11px] text-zinc-400">Windows, Mac, Linux</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Thiết bị di động</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Smartphone size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {(stats.mobileCount + stats.tabletCount).toLocaleString(lang)}
          </p>
          <span className="text-[11px] text-zinc-400">iOS & Android</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Hoạt động 24h</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {stats.active24hCount.toLocaleString(lang)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tương tác gần đây</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "Tất cả", icon: Filter },
            { id: "desktop", label: "Máy tính", icon: Laptop },
            { id: "mobile", label: "Điện thoại", icon: Smartphone },
            { id: "tablet", label: "Máy tính bảng", icon: Tablet },
          ].map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0",
                  isSelected
                    ? "bg-ion-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Icon size={14} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[280px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo email, tên, IP..."
            className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-ion-500/30 focus:border-ion-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchParams({});
                loadSessions("", selectedType);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 size={28} className="animate-spin text-ion-500" />
          <span className="text-xs">Đang tải danh sách thiết bị và phiên...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Smartphone size={36} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Không tìm thấy phiên đăng nhập nào</p>
          <p className="text-xs text-zinc-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((sess) => {
            const isMobile = sess.deviceType === "mobile";
            const isTablet = sess.deviceType === "tablet";
            const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

            return (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between gap-4"
              >
                {/* Header: User info */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={sess.user} size={38} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {sess.user?.username || "Người dùng"}
                        </span>
                        {sess.user?.role === "admin" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{sess.user?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeAllUserSessions(sess.userId, sess.user?.username)}
                    disabled={revokingUser === sess.userId}
                    title="Đăng xuất user này khỏi mọi thiết bị"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    {revokingUser === sess.userId ? (
                      <Loader2 size={15} className="animate-spin text-rose-500" />
                    ) : (
                      <ShieldAlert size={15} />
                    )}
                  </button>
                </div>

                {/* Device Card Body */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={clsx(
                          "p-2 rounded-lg shrink-0",
                          isMobile
                            ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : isTablet
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        <DeviceIcon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {sess.os || "Hệ điều hành"} · {sess.browser || "Trình duyệt"}
                      </span>
                    </div>

                    {sess.rememberMe && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ion-500/10 text-ion-600 dark:text-ion-400 border border-ion-500/20 shrink-0">
                        30 ngày
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5 truncate">
                      <Globe size={12} className="text-zinc-400 shrink-0" />
                      <span className="truncate">{sess.ipAddress || "127.0.0.1"}</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate justify-end">
                      <Clock size={12} className="text-zinc-400 shrink-0" />
                      <span>{formatActivityTime(sess.lastActiveAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">
                    Tạo: {new Date(sess.createdAt).toLocaleDateString(lang)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id, sess.user?.username)}
                    disabled={revokingId === sess.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 transition-all disabled:opacity-50"
                  >
                    {revokingId === sess.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <LogOut size={13} />
                    )}
                    <span>Đăng xuất thiết bị</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
