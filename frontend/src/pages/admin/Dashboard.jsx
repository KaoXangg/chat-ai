import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, MessageSquare, MessagesSquare, ShieldBan, CheckCircle2, XCircle, ArrowUpRight, Cpu, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import api from "../../api/axios.js";
import { Skeleton } from "../../components/Skeleton.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const STAT_TONES = {
  brand: "text-brand-600 dark:text-brand-300 bg-brand-500/10",
  ion: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  danger: "text-red-600 dark:text-red-400 bg-red-500/10",
  amber: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
};

function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  const { lang } = useI18n();
  return (
    <div className="admin-stat">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm workspace-muted leading-relaxed">{label}</p>
        <span className={`admin-stat-icon ${STAT_TONES[tone]}`}><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <p className="admin-stat-value">{value.toLocaleString(lang)}</p>
    </div>
  );
}

const QUICK_LINKS = [
  { to: "/admin/users", icon: Users, labelKey: "admin.dash.quickUsers", descriptionKey: "admin.users.subtitle" },
  { to: "/admin/models", icon: Cpu, labelKey: "admin.dash.quickModels", descriptionKey: "admin.models.subtitle" },
  { to: "/admin/conversations", icon: MessagesSquare, labelKey: "admin.dash.quickConversations", descriptionKey: "admin.conv.subtitle" },
];
const PROVIDER_COLORS = { groq: "#d97706", gemini: "#8070e8", openrouter: "#14b8a6" };

function ChartTooltip({ active, payload, label }) {
  const { t, lang } = useI18n();
  if (!active || !payload?.length) return null;
  return <div className="admin-chart-tooltip"><p className="text-xs workspace-muted mb-1 capitalize">{label}</p><p className="text-sm font-semibold tabular-nums">{t("admin.dash.chartCount", { n: Number(payload[0].value).toLocaleString(lang) })}</p></div>;
}

function EmptyChart({ label }) {
  return <div className="admin-chart-empty"><Activity size={24} strokeWidth={1.4} /><p>{label}</p></div>;
}

export default function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api.get("/admin/stats").then((res) => setStats(res.data.data)).catch(() => setLoadError(true));
  }, []);

  if (loadError) return <div className="admin-panel flex items-center gap-3 text-sm text-red-600 dark:text-red-400" role="alert"><XCircle size={20} className="shrink-0" />{t("admin.dash.loadFail")}</div>;

  if (!stats) {
    return (
      <div className="admin-page space-y-6" aria-busy="true">
        <div className="admin-page-heading"><h1>{t("admin.dash.title")}</h1><p>{t("admin.dash.subtitle")}</p></div>
        <div className="admin-stats">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="admin-stat space-y-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-20" /></div>)}</div>
        <div className="admin-dashboard-grid"><div className="admin-panel"><Skeleton className="h-4 w-48 mb-6" /><Skeleton className="h-[260px] w-full" /></div><div className="admin-panel space-y-5"><Skeleton className="h-4 w-36" />{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div></div>
      </div>
    );
  }

  const { totals, messagesPerDay, modelUsage, configuredProviders } = stats;
  const chartData = messagesPerDay.map((d) => ({ date: d._id.slice(5), count: d.count }));
  const usageData = modelUsage.map((m) => ({ provider: m._id, count: m.count }));
  const ALL_PROVIDERS = ["groq", "gemini", "openrouter"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="admin-page space-y-6">
      <div className="admin-page-heading"><h1>{t("admin.dash.title")}</h1><p>{t("admin.dash.subtitle")}</p></div>
      <div className="admin-stats">
        <StatCard icon={Users} label={t("admin.dash.totalUsers")} value={totals.totalUsers} />
        <StatCard icon={CheckCircle2} label={t("admin.dash.activeUsers")} value={totals.activeUsers} tone="ion" />
        <StatCard icon={ShieldBan} label={t("admin.dash.bannedUsers")} value={totals.bannedUsers} tone="danger" />
        <StatCard icon={MessagesSquare} label={t("admin.dash.conversations")} value={totals.totalConversations} tone="amber" />
        <StatCard icon={MessageSquare} label={t("admin.dash.messages")} value={totals.totalMessages} />
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel min-w-0">
          <div className="admin-panel-heading"><h2>{t("admin.dash.perDay")}</h2><Activity size={18} className="workspace-muted shrink-0" /></div>
          {chartData.length === 0 ? <EmptyChart label={t("admin.dash.noMessages")} /> : (
            <div className="admin-line-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--workspace-border)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "var(--workspace-muted)" }} tickLine={false} axisLine={false} minTickGap={24} dy={10} />
                  <YAxis fontSize={11} tick={{ fill: "var(--workspace-muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--workspace-muted)", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="count" name={t("admin.dash.messages")} stroke="#8070e8" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: "var(--workspace-panel)", strokeWidth: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>{t("admin.dash.providers")}</h2><Cpu size={18} className="workspace-muted shrink-0" /></div>
          <div className="admin-provider-list">
            {ALL_PROVIDERS.map((p) => {
              const configured = configuredProviders.includes(p);
              const usage = modelUsage.find((m) => m._id === p)?.count || 0;
              return (
                <div key={p} className="admin-provider-row">
                  <span className="admin-provider-monogram" style={{ color: PROVIDER_COLORS[p] }}>{p[0].toUpperCase()}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold capitalize">{p}</p><p className="text-xs workspace-muted mt-1">{t("admin.dash.requests", { n: usage })}</p></div>
                  <span className={`admin-provider-status ${configured ? "is-configured" : "is-missing"}`}>
                    {configured ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {configured ? t("admin.dash.configured") : t("admin.dash.notConfigured")}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs workspace-muted mt-5 leading-relaxed">{t("admin.dash.providerHint")}</p>
        </section>
        <section className="admin-panel min-w-0">
          <div className="admin-panel-heading"><h2>{t("admin.dash.distribution")}</h2><MessagesSquare size={18} className="workspace-muted shrink-0" /></div>
          {usageData.length === 0 ? <EmptyChart label={t("admin.dash.noResponses")} /> : (
            <div className="admin-bar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData} layout="vertical" margin={{ top: 4, right: 20, bottom: 8, left: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--workspace-border)" strokeDasharray="4 4" />
                  <XAxis type="number" fontSize={11} tick={{ fill: "var(--workspace-muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="provider" fontSize={12} width={88} tick={{ fill: "var(--workspace-text)" }} tickLine={false} axisLine={false} className="capitalize" />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--workspace-hover)" }} />
                  <Bar dataKey="count" name={t("admin.dash.messages")} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                    {usageData.map((d, i) => <Cell key={i} fill={PROVIDER_COLORS[d.provider] || "#8070e8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>{t("admin.dash.quick")}</h2><ArrowUpRight size={18} className="workspace-muted shrink-0" /></div>
          <div className="space-y-1">
            {QUICK_LINKS.map(({ to, icon: Icon, labelKey, descriptionKey }) => (
              <Link key={to} to={to} className="admin-quick-link group">
                <span className="admin-quick-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{t(labelKey)}</p><p className="text-xs workspace-muted mt-1 leading-relaxed">{t(descriptionKey)}</p></div>
                <ArrowUpRight size={16} className="workspace-muted shrink-0 group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
