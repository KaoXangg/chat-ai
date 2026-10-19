import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldBan, ShieldCheck, Trash2, ShieldPlus, ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import api from "../../api/axios.js";
import { TableRowSkeleton, CardRowSkeleton } from "../../components/Skeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import UserAvatar from "../../components/UserAvatar.jsx";
import UserDetailModal from "../../components/admin/UserDetailModal.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const PAGE_SIZE = 10;

function RoleBadge({ role }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs ${
        role === "admin" ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "bg-black/5 dark:bg-white/10"
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs ${
        status === "banned" ? "bg-red-500/10 text-red-500" : "bg-ion-500/10 text-ion-600"
      }`}
    >
      {status === "banned" ? t("admin.users.statusBanned") : t("admin.users.statusActive")}
    </span>
  );
}

import { RotateCcw, SlidersHorizontal, Crown } from "lucide-react";

function TierBadge({ tier }) {
  if (tier === "vip") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
        <Crown size={11} /> VIP
      </span>
    );
  }
  if (tier === "pro") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
        PRO
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
      Free
    </span>
  );
}

function UserActions({ user, onToggleRole, onToggleBan, onRemove, onEditQuota, onResetQuota, stopPropagation = false }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const wrap = (fn) => (e) => {
    if (stopPropagation) e.stopPropagation();
    fn(user);
  };
  return (
    <div className="admin-user-actions flex items-center gap-1 justify-end">
      <Tooltip label="Xem thiết bị & phiên đăng nhập" align="end">
        <button
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
            navigate(`/admin/sessions?search=${encodeURIComponent(user.email)}`);
          }}
          aria-label={`Xem thiết bị của ${user.username}`}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-violet-600 dark:text-violet-400"
        >
          <Smartphone size={15} />
        </button>
      </Tooltip>
      <Tooltip label={t("admin.users.editQuotaTooltip")} align="end">
        <button
          onClick={wrap(onEditQuota)}
          aria-label={t("admin.users.editQuotaTooltip")}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-brand-600 dark:text-brand-400"
        >
          <SlidersHorizontal size={15} />
        </button>
      </Tooltip>
      <Tooltip label={t("admin.users.resetQuotaTooltip")} align="end">
        <button
          onClick={wrap(onResetQuota)}
          aria-label={t("admin.users.resetQuotaTooltip")}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-amber-500"
        >
          <RotateCcw size={15} />
        </button>
      </Tooltip>

      <Tooltip label={t("admin.users.toggleRole")} align="end">
        <button
          onClick={wrap(onToggleRole)}
          aria-label={t("admin.users.toggleRoleFor", { name: user.username })}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ShieldPlus size={15} className={user.role === "admin" ? "text-brand-500" : "opacity-50"} />
        </button>
      </Tooltip>
      <Tooltip label={user.status === "banned" ? t("admin.users.unban") : t("admin.users.ban")} align="end">
        <button
          onClick={wrap(onToggleBan)}
          aria-label={user.status === "banned" ? t("admin.users.unbanFor", { name: user.username }) : t("admin.users.banFor", { name: user.username })}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
        >
          {user.status === "banned" ? <ShieldCheck size={15} className="text-ion-500" /> : <ShieldBan size={15} className="text-amber-500" />}
        </button>
      </Tooltip>
      <Tooltip label={t("admin.users.remove")} align="end">
        <button
          onClick={wrap(onRemove)}
          aria-label={t("admin.users.removeFor", { name: user.username })}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const loadVersionRef = useRef(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const { t, lang, errorMessage } = useI18n();

  const load = useCallback(
    async (opts = {}) => {
      const version = ++loadVersionRef.current;
      setLoading(true);
      try {
        const res = await api.get("/admin/users", {
          params: {
            search: opts.search ?? search,
            role: opts.role ?? roleFilter,
            status: opts.status ?? statusFilter,
            page: opts.page ?? page,
            limit: PAGE_SIZE,
          },
        });
        if (version !== loadVersionRef.current) return;
        const lastPage = Math.max(1, Math.ceil(res.data.data.total / PAGE_SIZE));
        setPage((current) => Math.min(current, lastPage));
        setUsers(res.data.data.users);
        setTotal(res.data.data.total);
      } catch (err) {
        if (version === loadVersionRef.current) toast.error(errorMessage(err, "admin.users.err.load"));
      } finally {
        if (version === loadVersionRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, roleFilter, statusFilter, page, refresh]
  );

  useEffect(() => {
    load();
    return () => { loadVersionRef.current += 1; };
  }, [load]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const toggleBan = async (user) => {
    const status = user.status === "banned" ? "active" : "banned";
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, status } : u)));
    try {
      await api.patch(`/admin/users/${user._id}`, { status });
      toast.success(status === "banned" ? t("admin.users.banned", { name: user.username }) : t("admin.users.unbanned", { name: user.username }));
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, status: user.status } : u)));
      toast.error(errorMessage(err, "admin.users.err.status"));
    }
  };

  const toggleRole = async (user) => {
    const role = user.role === "admin" ? "user" : "admin";
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role } : u)));
    try {
      await api.patch(`/admin/users/${user._id}`, { role });
      toast.success(t("admin.users.roleChanged", { name: user.username, role }));
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: user.role } : u)));
      toast.error(errorMessage(err, "admin.users.err.role"));
    }
  };

  const remove = async (user) => {
    const ok = await confirm({
      title: t("admin.users.deleteTitle"),
      message: t("admin.users.deleteMessage", { name: user.username }),
      confirmLabel: t("admin.users.deleteOk"),
      danger: true,
    });
    if (!ok) return false;
    try {
      await api.delete(`/admin/users/${user._id}`);
      setRefresh((value) => value + 1);
      toast.success(t("admin.users.removed", { name: user.username }));
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "admin.users.err.delete"));
      return false;
    }
  };

  const [quotaModalUser, setQuotaModalUser] = useState(null);
  const [quotaForm, setQuotaForm] = useState({ customDailyTokenLimit: "", userTier: "free" });
  const [quotaSaving, setQuotaSaving] = useState(false);

  const openQuotaModal = (u) => {
    setQuotaModalUser(u);
    setQuotaForm({
      customDailyTokenLimit: u.customDailyTokenLimit !== null && u.customDailyTokenLimit !== undefined ? String(u.customDailyTokenLimit) : "",
      userTier: u.userTier || "free",
    });
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!quotaModalUser) return;
    setQuotaSaving(true);
    try {
      const limitVal = quotaForm.customDailyTokenLimit.trim() === "" ? null : parseInt(quotaForm.customDailyTokenLimit, 10);
      const res = await api.patch(`/admin/users/${quotaModalUser._id}/quota`, {
        customDailyTokenLimit: limitVal,
        userTier: quotaForm.userTier,
      });
      if (res.data.success) {
        toast.success(`Đã cập nhật gói & hạn ngạch cho ${quotaModalUser.username}.`);
        setUsers((prev) => prev.map((u) => (u._id === quotaModalUser._id ? { ...u, customDailyTokenLimit: limitVal, userTier: quotaForm.userTier } : u)));
        setQuotaModalUser(null);
      }
    } catch {
      toast.error("Không thể cập nhật hạn ngạch.");
    } finally {
      setQuotaSaving(false);
    }
  };

  const handleResetQuota = async (u) => {
    const ok = await confirm({
      title: t("admin.users.resetQuotaConfirmTitle"),
      message: t("admin.users.resetQuotaConfirmMsg", { name: u.username }).replace("{name}", u.username),
      confirmLabel: t("admin.users.resetQuotaBtn"),
      danger: false,
    });

    if (!ok) return;

    try {
      const res = await api.post(`/admin/users/${u._id}/reset-quota`);
      if (res.data.success) {
        toast.success(res.data.data.message || "Đã reset hạn ngạch hôm nay.");
      }
    } catch {
      toast.error("Không thể reset hạn ngạch.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-page space-y-5">
      <div className="admin-page-heading">
        <h1 className="font-display text-xl font-semibold tracking-tight">{t("admin.users.title")}</h1>
        <p className="text-sm opacity-50">{t("admin.users.subtitle")}</p>
      </div>

      <div className="admin-filters flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl glass border border-edge-light dark:border-edge-dark w-full max-w-sm">
          <Search size={15} className="opacity-50" />
          <label htmlFor="user-search" className="sr-only">
            {t("admin.users.searchLabel")}
          </label>
          <input
            id="user-search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
            className="bg-transparent outline-hidden text-sm flex-1"
          />
        </div>

        <select
          aria-label={t("admin.users.colRole")}
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-2xl glass border border-edge-light dark:border-edge-dark text-sm outline-hidden"
        >
          <option value="">{t("admin.users.allRoles")}</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        <select
          aria-label={t("admin.users.colStatus")}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-2xl glass border border-edge-light dark:border-edge-dark text-sm outline-hidden"
        >
          <option value="">{t("admin.users.allStatuses")}</option>
          <option value="active">{t("admin.users.statusActive")}</option>
          <option value="banned">{t("admin.users.statusBanned")}</option>
        </select>

        <span className="text-xs opacity-50 ms-auto">{t("admin.users.count", { n: total })}</span>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <CardRowSkeleton key={i} />)}
        {!loading &&
          users.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedUserId(u._id)}
              className="admin-data-panel p-4 space-y-3 hover:border-brand-400/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar user={u} size={36} />
                  <div className="min-w-0">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedUserId(u._id); }} className="block font-medium truncate max-w-full text-start">{u.username}</button>
                    <p className="text-xs workspace-muted truncate mt-1">{u.email}</p>
                  </div>
                </div>
                <RoleBadge role={u.role} />
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={u.status} />
                <span className="text-xs opacity-50">{new Date(u.createdAt).toLocaleDateString(lang)}</span>
              </div>
              <div className="pt-1 border-t border-edge-light dark:border-edge-dark flex justify-end">
                <UserActions user={u} onToggleRole={toggleRole} onToggleBan={toggleBan} onRemove={remove} stopPropagation />
              </div>
            </div>
          ))}
        {!loading && users.length === 0 && <p className="text-center text-sm opacity-40 py-8">{t("admin.users.empty")}</p>}
      </div>

      {/* Desktop / tablet: table */}
      <div className="admin-data-panel hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 text-start">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin.users.colUser")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colEmail")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colTierQuota")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colRole")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colCreated")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("admin.users.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: PAGE_SIZE }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
              {!loading &&
                users.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => setSelectedUserId(u._id)}
                    className="border-t border-edge-light dark:border-edge-dark hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium"><div className="flex items-center gap-3"><UserAvatar user={u} size={32} /><button onClick={(e) => { e.stopPropagation(); setSelectedUserId(u._id); }} className="text-start hover:text-brand-500">{u.username}</button></div></td>
                    <td className="px-4 py-3 opacity-70">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TierBadge tier={u.userTier} />
                        <span className="text-xs opacity-60 font-mono">
                          {u.customDailyTokenLimit === 0
                            ? t("admin.users.unlimited")
                            : u.customDailyTokenLimit
                            ? t("admin.users.perDay", { n: Number(u.customDailyTokenLimit).toLocaleString() }).replace("{n}", Number(u.customDailyTokenLimit).toLocaleString())
                            : t("admin.users.defaultQuota")}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 opacity-50">{new Date(u.createdAt).toLocaleDateString(lang)}</td>
                    <td className="px-4 py-3">
                      <UserActions
                        user={u}
                        onToggleRole={toggleRole}
                        onToggleBan={toggleBan}
                        onRemove={remove}
                        onEditQuota={openQuotaModal}
                        onResetQuota={handleResetQuota}
                        stopPropagation
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!loading && users.length === 0 && <p className="text-center text-sm opacity-40 py-8">{t("admin.users.empty")}</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label={t("admin.page.prev")}
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm opacity-60">
            {t("admin.page.of", { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label={t("admin.page.next")}
            className="p-2 rounded-xl glass border border-edge-light dark:border-edge-dark disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Chỉnh sửa Quota & Tier */}
      {quotaModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {t("admin.users.quotaModalTitle", { name: quotaModalUser.username }).replace("{name}", quotaModalUser.username)}
            </h2>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              <div>
                <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                  {t("admin.users.quotaTierLabel")}
                </label>
                <select
                  value={quotaForm.userTier}
                  onChange={(e) => setQuotaForm({ ...quotaForm, userTier: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none text-xs"
                >
                  <option value="free">Free (Miễn phí - 50k tokens)</option>
                  <option value="plus">Plus (Nâng cao - 250k tokens)</option>
                  <option value="premium">Premium (Cao cấp - 1M tokens)</option>
                  <option value="pro">Pro (Legacy - 250k)</option>
                  <option value="vip">VIP (Legacy - 1M)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                  {t("admin.users.quotaLimitLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={quotaForm.customDailyTokenLimit}
                  onChange={(e) => setQuotaForm({ ...quotaForm, customDailyTokenLimit: e.target.value })}
                  placeholder={t("admin.users.quotaLimitPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none text-xs"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  {t("admin.users.quotaLimitHint")}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setQuotaModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {t("admin.users.cancelBtn")}
                </button>
                <button
                  type="submit"
                  disabled={quotaSaving}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium"
                >
                  {quotaSaving ? t("admin.users.savingBtn") : t("admin.users.saveBtn")}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      <UserDetailModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onToggleRole={toggleRole}
        onToggleBan={toggleBan}
        onRemove={remove}
      />
    </div>
  );
}
