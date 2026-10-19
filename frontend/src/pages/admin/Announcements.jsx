import { useState, useEffect } from "react";
import { 
  Megaphone, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  X
} from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import clsx from "clsx";

export default function AdminAnnouncements() {
  const { t } = useI18n();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const TYPE_CONFIG = {
    info: {
      label: t("announcements.typeInfo"),
      icon: Info,
      badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      bannerBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200",
    },
    warning: {
      label: t("announcements.typeWarning"),
      icon: AlertTriangle,
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      bannerBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200",
    },
    success: {
      label: t("announcements.typeSuccess"),
      icon: CheckCircle2,
      badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      bannerBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200",
    },
    promo: {
      label: t("announcements.typePromo"),
      icon: Sparkles,
      badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      bannerBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-800 dark:text-purple-200",
    },
  };

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "info",
    active: true,
    dismissible: true,
  });

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/announcements");
      if (res.data.success) {
        setAnnouncements(res.data.data.announcements || []);
      }
    } catch {
      toast.error("Không thể tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      title: "",
      content: "",
      type: "info",
      active: true,
      dismissible: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      type: item.type || "info",
      active: item.active !== false,
      dismissible: item.dismissible !== false,
    });
    setModalOpen(true);
  };

  const handleToggleActive = async (item) => {
    try {
      const newStatus = !item.active;
      await api.patch(`/admin/announcements/${item.id}`, { active: newStatus });
      toast.success(newStatus ? t("announcements.broadcasting") : t("announcements.paused"));
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, active: newStatus } : a))
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái thông báo.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.warning("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        active: form.active,
        dismissible: form.dismissible,
      };

      if (editingItem) {
        await api.patch(`/admin/announcements/${editingItem.id}`, payload);
        toast.success(t("announcements.btnSave"));
      } else {
        await api.post("/admin/announcements", payload);
        toast.success(t("announcements.btnCreateAndBroadcast"));
      }
      setModalOpen(false);
      loadAnnouncements();
    } catch {
      toast.error("Không thể lưu thông báo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa thông báo "${item.title}"?`)) return;
    try {
      await api.delete(`/admin/announcements/${item.id}`);
      toast.success("Đã xóa thông báo.");
      setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
    } catch {
      toast.error("Không thể xóa thông báo.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Megaphone className="text-brand-500" size={26} />
            {t("announcements.title")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("announcements.subtitle")}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={16} /> {t("announcements.createBtn")}
        </button>
      </div>

      {/* Danh sách thông báo */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[35vh]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-400 text-sm">
          {t("announcements.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className={clsx(
                  "p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                  item.active 
                    ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs" 
                    : "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 opacity-60"
                )}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", config.badgeBg)}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                    <span className={clsx(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full",
                      item.active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      {item.active ? t("announcements.broadcasting") : t("announcements.paused")}
                    </span>
                    {item.dismissible && (
                      <span className="text-[11px] text-zinc-400">{t("announcements.dismissibleHint")}</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Hành động */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                      item.active 
                        ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700" 
                        : "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20 hover:bg-brand-500/20"
                    )}
                  >
                    {item.active ? t("announcements.btnPause") : t("announcements.btnResume")}
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t("admin.conv.colActions")}
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tạo/Sửa thông báo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Megaphone size={18} className="text-brand-500" />
                {editingItem ? t("announcements.modalTitleEdit") : t("announcements.modalTitleCreate")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t("admin.dash.tier")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSel = form.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, type: key })}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all",
                          isSel
                            ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t("announcements.fieldTitle")}
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. System Update / Maintenance"
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t("announcements.fieldContent")}
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="..."
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none text-xs"
                />
              </div>

              {/* Tùy chọn */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>{t("announcements.activeImmediate")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.dismissible}
                    onChange={(e) => setForm({ ...form, dismissible: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>{t("announcements.allowDismiss")}</span>
                </label>
              </div>

              {/* Preview */}
              <div className="pt-2">
                <span className="block text-[11px] font-medium text-zinc-400 mb-1">
                  {t("announcements.livePreview")}
                </span>
                <div className={clsx("p-3 rounded-xl border text-xs flex items-start gap-2.5", (TYPE_CONFIG[form.type] || TYPE_CONFIG.info).bannerBg)}>
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <strong className="font-semibold block">{form.title || "Title"}</strong>
                    <span className="opacity-90">{form.content || "Content..."}</span>
                  </div>
                  {form.dismissible && <X size={14} className="opacity-60 shrink-0 cursor-pointer" />}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {t("admin.form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingItem ? t("announcements.btnSave") : t("announcements.btnCreateAndBroadcast")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
