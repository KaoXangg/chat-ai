import { useState, useEffect } from "react";
import { 
  Bot, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search, 
  Sparkles, 
  X
} from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { getLocalizedPersona } from "../../utils/personaHelper.js";
import clsx from "clsx";

export default function AdminPersonas() {
  const { t } = useI18n();
  const toast = useToast();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const CATEGORIES = [
    { id: "all", label: t("personas.catAll") },
    { id: "developer", label: t("personas.catCode") },
    { id: "academic", label: t("personas.catLanguage") },
    { id: "marketing", label: t("personas.catWriting") },
    { id: "business", label: t("personas.catBusiness") },
    { id: "general", label: "General" },
  ];

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    role: "",
    description: "",
    systemPrompt: "",
    avatar: "🤖",
    category: "general",
    suggestedPrompts: "",
  });

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/personas");
      if (res.data.success) {
        setPersonas(res.data.data.personas || []);
      }
    } catch {
      toast.error("Không thể tải danh sách trợ lý AI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const openCreateModal = () => {
    setEditingPersona(null);
    setForm({
      name: "",
      role: "",
      description: "",
      systemPrompt: "",
      avatar: "🤖",
      category: "developer",
      suggestedPrompts: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (persona) => {
    setEditingPersona(persona);
    let promptsStr = "";
    if (persona.suggestedPrompts) {
      try {
        const parsed = typeof persona.suggestedPrompts === "string" ? JSON.parse(persona.suggestedPrompts) : persona.suggestedPrompts;
        promptsStr = Array.isArray(parsed) ? parsed.join("\n") : String(parsed);
      } catch {
        promptsStr = String(persona.suggestedPrompts);
      }
    }
    setForm({
      name: persona.name || "",
      role: persona.role || "",
      description: persona.description || "",
      systemPrompt: persona.systemPrompt || "",
      avatar: persona.avatar || "🤖",
      category: persona.category || "general",
      suggestedPrompts: promptsStr,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.systemPrompt.trim()) {
      toast.warning("Vui lòng nhập Tên, Vai trò và System Prompt.");
      return;
    }

    setSaving(true);
    try {
      const promptsArray = form.suggestedPrompts
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        description: form.description.trim(),
        systemPrompt: form.systemPrompt.trim(),
        avatar: form.avatar.trim() || "🤖",
        category: form.category,
        suggestedPrompts: promptsArray,
      };

      if (editingPersona) {
        await api.patch(`/admin/personas/${editingPersona.id}`, payload);
        toast.success(t("admin.form.updated"));
      } else {
        await api.post("/admin/personas", payload);
        toast.success(t("admin.form.created"));
      }
      setModalOpen(false);
      await loadPersonas();
    } catch {
      toast.error(t("admin.form.save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (persona) => {
    if (!window.confirm(`Xóa trợ lý "${persona.name}"?`)) return;
    try {
      await api.delete(`/admin/personas/${persona.id}`);
      toast.success(t("admin.models.deleted"));
      await loadPersonas();
    } catch {
      toast.error(t("admin.models.err.delete"));
    }
  };

  const filteredPersonas = personas.filter((p) => {
    const loc = getLocalizedPersona(p, t);
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (p.name || "").toLowerCase().includes(q) ||
      (p.role || "").toLowerCase().includes(q) ||
      (loc.name || "").toLowerCase().includes(q) ||
      (loc.role || "").toLowerCase().includes(q);
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Bot className="text-brand-500" size={26} />
            {t("personas.adminTitle")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("personas.adminSubtitle")} ({personas.length}).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all"
        >
          <Plus size={16} /> {t("personas.addAssistant")}
        </button>
      </div>

      {/* Banner cam kết quyền riêng tư */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
        <Sparkles size={16} className="shrink-0 mt-0.5 text-blue-500" />
        <p className="leading-relaxed">
          {t("personas.adminPrivacyPolicy")}
        </p>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("personas.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid danh sách */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : filteredPersonas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-400 text-sm">
          {t("admin.models.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonas.map((persona) => {
            const loc = getLocalizedPersona(persona, t);
            return (
              <div
                key={persona.id}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-500/40 transition-colors group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                        {persona.avatar || "🤖"}
                      </span>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {loc.name}
                        </h3>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                          {loc.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase font-mono">
                      {persona.category}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {loc.description || "—"}
                  </p>

                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-3">
                    {persona.systemPrompt}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => openEditModal(persona)}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil size={13} /> {t("folder.edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(persona)}
                    className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={13} /> {t("folder.delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Sửa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles size={18} className="text-brand-500" />
                {editingPersona ? "Chỉnh sửa Trợ lý Hệ thống" : t("personas.addAssistant")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">{t("personas.formAvatar")}</label>
                  <input
                    type="text"
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-center text-lg outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">{t("personas.formName")}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">{t("personas.formRole")}</label>
                  <input
                    type="text"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none"
                  >
                    <option value="developer">Developer & Tech</option>
                    <option value="academic">Academic & Languages</option>
                    <option value="marketing">Marketing & Writing</option>
                    <option value="business">Business & Startup</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">{t("personas.formDesc")}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                  {t("personas.formPrompt")}
                </label>
                <textarea
                  rows={5}
                  required
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                  {t("personas.formSuggested")}
                </label>
                <textarea
                  rows={3}
                  value={form.suggestedPrompts}
                  onChange={(e) => setForm({ ...form, suggestedPrompts: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  {t("admin.form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingPersona ? t("admin.form.save") : t("personas.addAssistant")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
