import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Power, Star, Plus, Trash2, X, Pencil, Image as ImageIcon, Brain, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/axios.js";
import { CardRowSkeleton } from "../../components/Skeleton.jsx";
import { useToast, apiErrorMessage } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import Tooltip from "../../components/Tooltip.jsx";

const PROVIDERS = ["groq", "gemini", "openrouter"];
const CAPABILITY_OPTIONS = [
  { value: "text", label: "Văn bản" },
  { value: "reasoning", label: "Suy luận" },
  { value: "coding", label: "Lập trình" },
  { value: "vision", label: "Hình ảnh (Vision)" },
];
const EMPTY_FORM = {
  provider: "groq",
  modelId: "",
  displayName: "",
  description: "",
  priority: 0,
  contextLength: 8192,
  capabilities: ["text"],
};

function ModelFormModal({ open, onClose, onSaved, editingModel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
    const formRef = useModalA11y(open, onClose);
  const isEditing = Boolean(editingModel);

  useEffect(() => {
    if (!open) return;
    if (editingModel) {
      setForm({
        provider: editingModel.provider,
        modelId: editingModel.modelId,
        displayName: editingModel.displayName,
        description: editingModel.description || "",
        priority: editingModel.priority ?? 0,
        contextLength: editingModel.contextLength ?? 8192,
        capabilities: editingModel.capabilities?.length ? editingModel.capabilities : ["text"],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editingModel]);

  const toggleCapability = (value) => {
    setForm((f) => {
      const has = f.capabilities.includes(value);
      const next = has ? f.capabilities.filter((c) => c !== value) : [...f.capabilities, value];
      return { ...f, capabilities: next.length ? next : ["text"] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modelId.trim() || !form.displayName.trim()) {
      toast.warning("Vui lòng nhập đủ Model ID và Tên hiển thị.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      contextLength: Number(form.contextLength) || 8192,
    };
    try {
      if (isEditing) {
        const res = await api.patch(`/admin/models/${editingModel._id}`, payload);
        onSaved(res.data.data.model, "update");
        toast.success("Đã cập nhật mô hình.");
      } else {
        const res = await api.post("/admin/models", payload);
        onSaved(res.data.data.model, "create");
        toast.success("Đã thêm mô hình mới.");
      }
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEditing ? "Không thể cập nhật mô hình." : "Không thể thêm mô hình."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.form
            ref={formRef}
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? "Sửa mô hình AI" : "Thêm mô hình AI"}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl glass border border-edge-light dark:border-edge-dark shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold tracking-tight">{isEditing ? "Sửa mô hình AI" : "Thêm mô hình AI"}</h2>
              <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium opacity-60 mb-1 block">Nhà cung cấp</label>
                <select
                  value={form.provider}
                  disabled={isEditing}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400 disabled:opacity-50"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium opacity-60 mb-1 block">Model ID (tên gọi API thực tế)</label>
                <input
                  value={form.modelId}
                  disabled={isEditing}
                  onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))}
                  placeholder="vd: gemini-2.5-flash"
                  className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium opacity-60 mb-1 block">Tên hiển thị</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="vd: Gemini 2.5 Flash"
                  className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium opacity-60 mb-1 block">Mô tả (tùy chọn)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn hiển thị trong bộ chọn mô hình"
                  className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium opacity-60 mb-1.5 block">Khả năng (capabilities)</label>
                <div className="flex flex-wrap gap-1.5">
                  {CAPABILITY_OPTIONS.map((opt) => {
                    const active = form.capabilities.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleCapability(opt.value)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? "bg-brand-500/15 border-brand-400/50 text-brand-600 dark:text-brand-300"
                            : "border-edge-light dark:border-edge-dark opacity-60 hover:opacity-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] opacity-40 mt-1.5">Bật "Hình ảnh (Vision)" để cho phép người dùng đính kèm ảnh khi trò chuyện với mô hình này.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1 block">Độ dài ngữ cảnh (tokens)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.contextLength}
                    onChange={(e) => setForm((f) => ({ ...f, contextLength: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1 block">Thứ tự ưu tiên</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 text-sm outline-none focus:border-brand-400"
                  />
                </div>
              </div>
              <p className="text-[11px] opacity-40 -mt-1">
                Độ dài ngữ cảnh: giới hạn token thật của model; hệ thống tự bỏ bớt tin nhắn cũ để không vượt 70% giá trị này.
                Thứ tự ưu tiên: số nhỏ được dùng trước khi tự động chuyển sang nhà cung cấp khác (khi model bạn chọn lỗi hoặc hết lượt).
              </p>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-edge-light dark:border-edge-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-glow disabled:opacity-60 transition-all"
              >
                {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm mô hình"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminModels() {
  const [models, setModels] = useState([]);
  const [configuredProviders, setConfiguredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  const load = async () => {
    try {
      const res = await api.get("/admin/models");
      setModels(res.data.data.models);
      setConfiguredProviders(res.data.data.configuredProviders);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không thể tải danh sách mô hình."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEnabled = async (model) => {
    const next = !model.enabled;
    setModels((prev) => prev.map((m) => (m._id === model._id ? { ...m, enabled: next } : m)));
    try {
      await api.patch(`/admin/models/${model._id}`, { enabled: next });
    } catch (err) {
      setModels((prev) => prev.map((m) => (m._id === model._id ? { ...m, enabled: !next } : m)));
      toast.error(apiErrorMessage(err, "Không thể cập nhật trạng thái mô hình."));
    }
  };

  const setDefault = async (model) => {
    try {
      await api.patch(`/admin/models/${model._id}`, { isDefault: true });
      toast.success(`Đã đặt "${model.displayName}" làm mặc định.`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không thể đặt mô hình mặc định."));
    }
  };

  const removeModel = async (model) => {
    const ok = await confirm({
      title: "Xóa mô hình?",
      message: `Xóa "${model.displayName}" khỏi danh sách? Người dùng sẽ không thể chọn mô hình này nữa.`,
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/models/${model._id}`);
      setModels((prev) => prev.filter((m) => m._id !== model._id));
      toast.success("Đã xóa mô hình.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không thể xóa mô hình."));
    }
  };

  const grouped = models.reduce((acc, m) => {
    acc[m.provider] = acc[m.provider] || [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  const openCreate = () => {
    setEditingModel(null);
    setModalOpen(true);
  };

  const openEdit = (model) => {
    setEditingModel(model);
    setModalOpen(true);
  };

  const handleSaved = (model, mode) => {
    if (mode === "create") setModels((prev) => [...prev, model]);
    else setModels((prev) => prev.map((m) => (m._id === model._id ? model : m)));
  };

  const CAPABILITY_ICONS = { vision: ImageIcon, reasoning: Brain, coding: Code2 };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Quản lý mô hình AI</h1>
          <p className="text-sm opacity-50">Bật/tắt, thêm, sửa hoặc xóa mô hình hiển thị cho người dùng. API key được cấu hình trong tệp .env của backend, không lưu ở đây.</p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-glow transition-all"
        >
          <Plus size={15} /> Thêm mô hình
        </button>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardRowSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && models.length === 0 && (
        <p className="text-sm opacity-40 py-6 text-center">Chưa có mô hình nào được cấu hình.</p>
      )}

      {Object.entries(grouped).map(([provider, list]) => {
        const configured = configuredProviders.includes(provider);
        return (
          <div key={provider} className="rounded-2xl glass border border-edge-light dark:border-edge-dark overflow-hidden shadow-soft">
            <div className="flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5">
              <span className="font-medium capitalize text-sm">{provider}</span>
              <span className={`flex items-center gap-1.5 text-xs ${configured ? "text-ion-600" : "text-red-500"}`}>
                {configured ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {configured ? "Đã có API key" : "Chưa có API key trong .env"}
              </span>
            </div>
            <div className="divide-y divide-edge-light dark:divide-edge-dark">
              {list.map((m) => (
                <div key={m._id} className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{m.displayName}</span>
                      {m.isDefault && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                      {m.capabilities
                        ?.filter((c) => CAPABILITY_ICONS[c])
                        .map((c) => {
                          const Icon = CAPABILITY_ICONS[c];
                          return (
                            <Tooltip key={c} label={CAPABILITY_OPTIONS.find((o) => o.value === c)?.label ?? c} side="top">
                              <span className="w-4 h-4 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                                <Icon size={10} />
                              </span>
                            </Tooltip>
                          );
                        })}
                    </div>
                    <p className="text-xs opacity-50 truncate">{m.modelId}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!m.isDefault && (
                      <button onClick={() => setDefault(m)} className="text-xs px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap">
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      onClick={() => toggleEnabled(m)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                        m.enabled ? "bg-ion-500/10 text-ion-600" : "bg-black/5 dark:bg-white/10 opacity-60"
                      }`}
                    >
                      <Power size={13} /> {m.enabled ? "Đang bật" : "Đã tắt"}
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      aria-label={`Sửa mô hình ${m.displayName}`}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeModel(m)}
                      aria-label={`Xóa mô hình ${m.displayName}`}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <ModelFormModal
        open={modalOpen}
        editingModel={editingModel}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}