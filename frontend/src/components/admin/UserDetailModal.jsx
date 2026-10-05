import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronRight, Loader2, Mail, MessageSquare, MessagesSquare, ShieldBan, ShieldCheck, ShieldPlus, Trash2, UserRound, X } from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { Skeleton } from "../Skeleton.jsx";
import UserAvatar from "../UserAvatar.jsx";

function DetailAction({ icon: Icon, label, description, tone = "brand", busy, disabled, onClick }) {
  return (
    <button type="button" className={`user-detail-action is-${tone}`} disabled={disabled} onClick={onClick} aria-busy={busy}>
      <span className="user-detail-action-icon" aria-hidden="true">
        {busy ? <Loader2 size={19} className="animate-spin" /> : <Icon size={19} strokeWidth={1.8} />}
      </span>
      <span className="user-detail-action-copy"><span>{label}</span><span>{description}</span></span>
      <ChevronRight size={16} className="user-detail-action-arrow" aria-hidden="true" />
    </button>
  );
}

export default function UserDetailModal({ userId, onClose, onToggleRole, onToggleBan, onRemove }) {
  const { t, lang, errorMessage } = useI18n();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const activeUserId = useRef(userId);
  const dialogRef = useModalA11y(Boolean(userId), onClose);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    activeUserId.current = userId;
    setBusy(null);
    if (!userId) return;
    setDetail(null);
    const controller = new AbortController();
    setLoading(true);
    api.get(`/admin/users/${userId}`, { signal: controller.signal })
      .then((res) => setDetail(res.data.data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        toast.error(errorMessage(err, "admin.users.err.detail"));
        onClose();
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); activeUserId.current = null; };
    // Load only when the selected account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const runAction = async (action, callback) => {
    if (busy || !detail) return;
    const currentId = userId;
    setBusy(action);
    try {
      const result = await callback(detail.user);
      if (activeUserId.current !== currentId) return;
      if (action === "delete") {
        if (result) onClose();
      } else {
        const res = await api.get(`/admin/users/${currentId}`);
        if (activeUserId.current === currentId) setDetail(res.data.data);
      }
    } catch (err) {
      if (activeUserId.current === currentId) toast.error(errorMessage(err, "admin.users.err.detail"));
    } finally {
      if (activeUserId.current === currentId) setBusy(null);
    }
  };

  const user = detail?.user;
  const isAdmin = user?.role === "admin";
  const isBanned = user?.status === "banned";

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }} onClick={onClose}
            className="user-detail-backdrop" style={{ margin: 0 }} aria-hidden="true" />
          <motion.div className="user-detail-stage" style={{ margin: 0 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}>
            <motion.section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="user-detail-title"
              initial={{ y: reducedMotion ? 0 : 18, scale: reducedMotion ? 1 : 0.97 }} animate={{ y: 0, scale: 1 }}
              exit={{ y: reducedMotion ? 0 : 12, scale: reducedMotion ? 1 : 0.98 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="admin-dialog user-detail-modal">
              <header className="user-detail-header">
                <span className="user-detail-header-icon" aria-hidden="true"><UserRound size={20} strokeWidth={1.8} /></span>
                <div className="min-w-0 flex-1">
                  <h2 id="user-detail-title">{t("admin.users.detailTitle")}</h2>
                  <p>{t("admin.users.detailSubtitle")}</p>
                </div>
                <button type="button" onClick={onClose} aria-label={t("common.close")} className="workspace-icon-button user-detail-close"><X size={19} /></button>
              </header>
  
              <div className="user-detail-body" aria-busy={loading}>
                {loading || !detail ? (
                  <div className="user-detail-grid user-detail-skeleton" role="status" aria-label={t("admin.users.detailTitle")}>
                    <div className="user-detail-profile user-detail-skeleton-profile">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="w-[88px] h-[88px] rounded-full self-center" />
                      <Skeleton className="h-5 w-3/4 self-center" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-7 w-3/4 self-center" />
                      <Skeleton className="h-12 w-full mt-auto rounded-xl" />
                    </div>
                    <div className="user-detail-skeleton-summary">
                      <Skeleton className="h-4 w-1/2" />
                      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
                      <Skeleton className="h-4 w-1/2 mt-2" />
                      {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                    </div>
                  </div>
                ) : (
                  <div className="user-detail-grid">
                    <section className="user-detail-profile" aria-label={t("admin.users.colUser")}>
                      <div className="user-detail-cover" aria-hidden="true" />
                      <div className="user-detail-profile-content">
                        <div className="user-detail-avatar"><UserAvatar user={user} size={88} /></div>
                        <h3>{user.username}</h3>
                        <p className="user-detail-email"><Mail size={14} aria-hidden="true" /><span>{user.email}</span></p>
                        <div className="user-detail-badges">
                          <span className={`user-detail-badge ${isAdmin ? "is-admin" : ""}`}>
                            {isAdmin ? <ShieldCheck size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                            {t(isAdmin ? "admin.layout.roleLabel" : "admin.users.roleUser")}
                          </span>
                          <span className={`user-detail-badge user-detail-status ${isBanned ? "is-banned" : "is-active"}`}>
                            <span className="user-detail-status-dot" aria-hidden="true" />
                            {t(isBanned ? "admin.users.statusBanned" : "admin.users.statusActive")}
                          </span>
                        </div>
                        <div className="user-detail-joined"><CalendarDays size={15} aria-hidden="true" />
                          <span>{t("admin.users.joined", { date: new Date(user.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) })}</span>
                        </div>
                      </div>
                    </section>
  
                    <section aria-labelledby="user-detail-activity">
                      <h3 className="user-detail-section-title" id="user-detail-activity">{t("admin.users.activity")}</h3>
                      <div className="user-detail-stats">
                        <div className="user-detail-stat">
                          <span className="user-detail-stat-icon" aria-hidden="true"><MessagesSquare size={18} strokeWidth={1.8} /></span>
                          <p>{Number(detail.usage.conversationCount).toLocaleString(lang)}</p>
                          <span>{t("admin.users.statConversations")}</span>
                        </div>
                        <div className="user-detail-stat is-messages">
                          <span className="user-detail-stat-icon" aria-hidden="true"><MessageSquare size={18} strokeWidth={1.8} /></span>
                          <p>{Number(detail.usage.messageCount).toLocaleString(lang)}</p>
                          <span>{t("admin.users.statMessages")}</span>
                        </div>
                      </div>
                    </section>
  
                    <section aria-labelledby="user-detail-management">
                      <h3 className="user-detail-section-title" id="user-detail-management">{t("admin.users.management")}</h3>
                      <div className="user-detail-actions">
                        <DetailAction icon={isAdmin ? ShieldCheck : ShieldPlus} label={t(isAdmin ? "admin.users.demote" : "admin.users.promote")}
                          description={t(isAdmin ? "admin.users.demoteHint" : "admin.users.promoteHint")}
                          busy={busy === "role"} disabled={Boolean(busy)} onClick={() => runAction("role", onToggleRole)} />
                        <DetailAction icon={isBanned ? ShieldCheck : ShieldBan} tone={isBanned ? "success" : "warning"}
                          label={t(isBanned ? "admin.users.unbanAccount" : "admin.users.banAccount")}
                          description={t(isBanned ? "admin.users.unbanHint" : "admin.users.banHint")}
                          busy={busy === "status"} disabled={Boolean(busy)} onClick={() => runAction("status", onToggleBan)} />
                        <DetailAction icon={Trash2} tone="danger" label={t("admin.users.deleteAccount")}
                          description={t("admin.users.deleteHint")} busy={busy === "delete"} disabled={Boolean(busy)}
                          onClick={() => runAction("delete", onRemove)} />
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
