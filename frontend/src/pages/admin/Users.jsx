import { useEffect, useState, useCallback, useRef } from "react";
import { Search, ShieldBan, ShieldCheck, Trash2, ShieldPlus, ChevronLeft, ChevronRight } from "lucide-react";
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

function UserActions({ user, onToggleRole, onToggleBan, onRemove, stopPropagation = false }) {
  const { t } = useI18n();
  const wrap = (fn) => (e) => {
    if (stopPropagation) e.stopPropagation();
    fn(user);
  };
  return (
    <div className="admin-user-actions flex items-center gap-1 justify-end">
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
                <th className="px-4 py-3 font-medium">{t("admin.users.colRole")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.colCreated")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("admin.users.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: PAGE_SIZE }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
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
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 opacity-50">{new Date(u.createdAt).toLocaleDateString(lang)}</td>
                    <td className="px-4 py-3">
                      <UserActions user={u} onToggleRole={toggleRole} onToggleBan={toggleBan} onRemove={remove} stopPropagation />
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
