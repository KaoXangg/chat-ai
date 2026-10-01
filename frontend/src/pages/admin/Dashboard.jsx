import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import api from "../../api/axios.js";
import { StatCardSkeleton, Skeleton } from "../../components/Skeleton.jsx";

const STAT_TONES = {
  brand: "from-brand-500/15 to-brand-600/5 text-brand-600 dark:text-brand-300",
  ion: "from-ion-500/15 to-ion-600/5 text-ion-600 dark:text-ion-400",
  danger: "from-red-500/15 to-red-600/5 text-red-500",
  amber: "from-amber-500/15 to-amber-600/5 text-amber-500",
};

function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -2 }}
      className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 flex items-center gap-3 shadow-soft transition-transform"
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br shrink-0 ${STAT_TONES[tone]}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-xs opacity-50 truncate">{label}</p>
        <p className="text-xl font-display font-semibold tabular-nums">{value.toLocaleString("vi-VN")}</p>
      </div>
    </motion.div>
  );
}

const QUICK_LINKS = [
  { to: "/admin/users", icon: Users, label: "Quản lý người dùng" },
  { to: "/admin/models", icon: Cpu, label: "Quản lý mô hình AI" },
  { to: "/admin/conversations", icon: MessagesSquare, label: "Kiểm duyệt hội thoại" },
];

const PROVIDER_COLORS = { groq: "#f97316", gemini: "#6d5bff", openrouter: "#2dd4bf" };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data.data))
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return (
      <div className="max-w-6xl">
        <p className="text-sm text-red-500">Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-sm opacity-50">Theo dõi hoạt động của Chat AI</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft">
            <Skeleton className="h-4 w-56 mb-4" />
            <Skeleton className="h-[220px] w-full" />
          </div>
          <div className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft space-y-2">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const { totals, messagesPerDay, modelUsage, configuredProviders } = stats;
  const chartData = messagesPerDay.map((d) => ({ date: d._id.slice(5), count: d.count }));
  const usageData = modelUsage.map((m) => ({ provider: m._id, count: m.count }));

  const ALL_PROVIDERS = ["groq", "gemini", "openrouter"];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-sm opacity-50">Theo dõi hoạt động của Chat AI</p>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <StatCard icon={Users} label="Tổng người dùng" value={totals.totalUsers} tone="brand" />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={totals.activeUsers} tone="ion" />
        <StatCard icon={ShieldBan} label="Bị khóa" value={totals.bannedUsers} tone="danger" />
        <StatCard icon={MessagesSquare} label="Cuộc trò chuyện" value={totals.totalConversations} tone="amber" />
        <StatCard icon={MessageSquare} label="Tổng tin nhắn" value={totals.totalMessages} tone="brand" />
      </motion.div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft">
          <h3 className="text-sm font-semibold mb-3">Tin nhắn / ngày (7 ngày gần nhất)</h3>
          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm opacity-40">Chưa có dữ liệu tin nhắn gần đây</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6d5bff" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="url(#lineGradient)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft">
          <h3 className="text-sm font-semibold mb-3">Trạng thái nhà cung cấp AI</h3>
          <div className="space-y-2">
            {ALL_PROVIDERS.map((p) => {
              const configured = configuredProviders.includes(p);
              const usage = modelUsage.find((m) => m._id === p)?.count || 0;
              return (
                <div key={p} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    {configured ? <CheckCircle2 size={15} className="text-ion-500" /> : <XCircle size={15} className="text-red-400" />}
                    <span className="text-sm capitalize">{p}</span>
                  </div>
                  <span className="text-xs opacity-50">{usage} yêu cầu</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs opacity-40 mt-3">Nhà cung cấp chưa có API key sẽ hiện dấu X. Thêm key vào tệp .env của backend rồi khởi động lại máy chủ.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft">
          <h3 className="text-sm font-semibold mb-3">Phân bổ phản hồi theo nhà cung cấp</h3>
          {usageData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm opacity-40">Chưa có phản hồi nào được ghi nhận</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={usageData} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="provider" fontSize={12} width={80} className="capitalize" />
                <Tooltip cursor={{ fill: "rgba(109,91,255,0.06)" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={22}>
                  {usageData.map((d, i) => (
                    <Cell key={i} fill={PROVIDER_COLORS[d.provider] || "#6d5bff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 shadow-soft flex flex-col">
          <h3 className="text-sm font-semibold mb-3">Truy cập nhanh</h3>
          <div className="space-y-1.5 flex-1">
            {QUICK_LINKS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
              >
                <span className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </span>
                <span className="flex-1">{label}</span>
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
