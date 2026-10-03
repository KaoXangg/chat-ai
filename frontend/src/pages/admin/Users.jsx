import { useEffect, useState, useCallback } from "react";
import { Search, ShieldBan, ShieldCheck, Trash2, ShieldPlus, ChevronLeft, ChevronRight, X, MessagesSquare, MessageSquare, CalendarDays } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../api/axios.js";
import { TableRowSkeleton, CardRowSkeleton, Skeleton } from "../../components/Skeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import Tooltip from "../../components/Tooltip.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const PAGE_SIZE = 10;

function RoleBadge({ role }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs ${
        role === "admin" ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white" : "bg-black/5 dark:bg-white/10"
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
    <div className="flex items-center gap-1 justify-end">
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

function UserDrawer({ userId, onClose, onToggleRole, onToggleBan, onRemove }) {
  const { t, lang, errorMessage } = useI18n();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
    const drawerRef = useModalA11y(Boolean(userId), onClose);

  const fetchDetail = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    api
      .get(`/admin/users/${userId}`)
      .then((res) => setDetail(res.data.data))
      .catch((err) => {
        toast.error(errorMessage(err, "admin.users.err.detail"));
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    setDetail(null);
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleToggleRole = async (user) => {
    await onToggleRole(user);
    fetchDetail();
  };

  const handleToggleBan = async (user) => {
    await onToggleBan(user);
    fetchDetail();
  };

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={t("admin.users.detailTitle")}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-sm glass border-l border-edge-light dark:border-edge-dark shadow-soft flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge-light dark:border-edge-dark">
              <h2 className="font-display text-base font-semibold tracking-tight">{t("admin.users.detailTitle")}</h2>
              <button onClick={onClose} aria-label={t("common.close")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading || !detail ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xl font-semibold shrink-0 shadow-glow">
                      {detail.user.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{detail.user.username}</p>
                      <p className="text-sm opacity-60 truncate">{detail.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RoleBadge role={detail.user.role} />
                    <StatusBadge status={detail.user.status} />
                  </div>

                  <div className="flex items-center gap-2 text-sm opacity-60">
                    <CalendarDays size={14} />
                    {t("admin.users.joined", { date: new Date(detail.user.createdAt).toLocaleDateString(lang) })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3.5 text-center">
                      <MessagesSquare size={18} className="mx-auto mb-1.5 text-brand-500" />
                      <p className="text-lg font-display font-semibold">{detail.usage.conversationCount}</p>
                      <p className="text-xs opacity-50">{t("admin.users.statConversations")}</p>
                    </div>
                    <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3.5 text-center">
                      <MessageSquare size={18} className="mx-auto mb-1.5 text-ion-500" />
                      <p className="text-lg font-display font-semibold">{detail.usage.messageCount}</p>
                      <p className="text-xs opacity-50">{t("admin.users.statMessages")}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-edge-light dark:border-edge-dark">
                    <p className="text-xs font-medium opacity-50 mb-2">{t("admin.users.actions")}</p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleToggleRole(detail.user)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <ShieldPlus size={15} className={detail.user.role === "admin" ? "text-brand-500" : "opacity-50"} />
                        {detail.user.role === "admin" ? t("admin.users.demote") : t("admin.users.promote")}
                      </button>
                      <button
                        onClick={() => handleToggleBan(detail.user)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        {detail.user.status === "banned" ? (
                          <ShieldCheck size={15} className="text-ion-500" />
                        ) : (
                          <ShieldBan size={15} className="text-amber-500" />
                        )}
                        {detail.user.status === "banned" ? t("admin.users.unbanAccount") : t("admin.users.banAccount")}
                      </button>
                      <button
                        onClick={() => {
                          onRemove(detail.user);
                          onClose();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} /> {t("admin.users.deleteAccount")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
  const [selectedUserId, setSelectedUserId] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const { t, lang, errorMessage } = useI18n();

  const load = useCallback(
    async (opts = {}) => {
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
        setUsers(res.data.data.users);
        setTotal(res.data.data.total);
      } catch (err) {
        toast.error(errorMessage(err, "admin.users.err.load"));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, roleFilter, statusFilter, page]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    load({ search: value, page: 1 });
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
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setTotal((n) => Math.max(0, n - 1));
      toast.success(t("admin.users.removed", { name: user.username }));
    } catch (err) {
      toast.error(errorMessage(err, "admin.users.err.delete"));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">{t("admin.users.title")}</h1>
        <p className="text-sm opacity-50">{t("admin.users.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-2xl glass border border-edge-light dark:border-edge-dark text-sm outline-none"
        >
          <option value="">{t("admin.users.allRoles")}</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-2xl glass border border-edge-light dark:border-edge-dark text-sm outline-none"
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
              className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 space-y-2.5 shadow-soft cursor-pointer hover:border-brand-400/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.username}</p>
                  <p className="text-xs opacity-60 truncate">{u.email}</p>
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
      <div className="hidden sm:block rounded-2xl glass border border-edge-light dark:border-edge-dark overflow-hidden shadow-soft">
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
                    <td className="px-4 py-3 font-medium">{u.username}</td>
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

      <UserDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onToggleRole={toggleRole}
        onToggleBan={toggleBan}
        onRemove={remove}
      />
    </div>
  );
}