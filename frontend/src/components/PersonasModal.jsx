import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Sparkles, 
  Bot, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Code2, 
  Languages, 
  PenTool, 
  TrendingUp, 
  ShieldCheck,
  Lock,
  Loader2,
  Info
} from "lucide-react";
import clsx from "clsx";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getLocalizedPersona } from "../utils/personaHelper.js";

const CATEGORY_MAP = {
  all: { labelKey: "personas.catAll", label: "Tất cả", icon: Sparkles },
  official: { labelKey: "personas.catOfficial", label: "🌟 Chính thức", icon: ShieldCheck },
  custom: { labelKey: "personas.catCustom", label: "🔒 Của tôi", icon: Lock },
  code: { labelKey: "personas.catCode", label: "Lập trình & Tech", icon: Code2 },
  language: { labelKey: "personas.catLanguage", label: "Ngoại ngữ & Học tập", icon: Languages },
  writing: { labelKey: "personas.catWriting", label: "Nội dung & Viết lách", icon: PenTool },
  business: { labelKey: "personas.catBusiness", label: "Kinh doanh & Chiến lược", icon: TrendingUp },
};

export default function PersonasModal({ open, onClose, onSelectPersona }) {
  const { t } = useI18n();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("explore"); // "explore" | "create"
  const toast = useToast();

  // State form tạo persona tùy biến riêng của user
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newAvatar, setNewAvatar] = useState("🤖");
  const [newSuggestedPrompts, setNewSuggestedPrompts] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const res = await api.get("/personas");
      if (res.data.success) {
        setPersonas(res.data.data.personas || []);
      }
    } catch {
      toast.error(t("personas.loadError") || "Không thể tải danh sách trợ lý.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPersonas();
      setActiveTab("explore");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const filteredPersonas = personas.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "official") return Boolean(p.isSystem);
    if (selectedCategory === "custom") return !p.isSystem;
    return p.category === selectedCategory;
  });

  const myCustomCount = personas.filter((p) => !p.isSystem).length;
  const officialCount = personas.filter((p) => p.isSystem).length;

  const handleCreatePersona = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPrompt.trim()) {
      toast.warning(t("personas.createWarning") || "Vui lòng nhập tên trợ lý và chỉ dẫn chuyên môn (System Prompt).");
      return;
    }

    setCreating(true);
    try {
      const promptArray = newSuggestedPrompts
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await api.post("/personas", {
        name: newName.trim(),
        role: newRole.trim() || (t("personas.customRoleFallback") || "Trợ lý chuyên gia riêng"),
        description: newDesc.trim(),
        systemPrompt: newPrompt.trim(),
        avatar: newAvatar,
        category: "custom",
        suggestedPrompts: promptArray,
      });

      if (res.data.success) {
        toast.success(t("personas.createSuccess") || "Đã tạo trợ lý riêng tư của bạn thành công!");
        setNewName("");
        setNewRole("");
        setNewDesc("");
        setNewPrompt("");
        setNewSuggestedPrompts("");
        setActiveTab("explore");
        fetchPersonas();
      }
    } catch {
      toast.error(t("personas.createError") || "Không thể tạo trợ lý.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePersona = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t("personas.deleteConfirm") || "Bạn có chắc muốn xóa trợ lý riêng này?")) return;
    try {
      const res = await api.delete(`/personas/${id}`);
      if (res.data.success) {
        toast.success(t("personas.deleteSuccess") || "Đã xóa trợ lý.");
        setPersonas((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      toast.error(t("personas.deleteError") || "Không thể xóa trợ lý.");
    }
  };

  const AVATARS = ["🤖", "👨‍💻", "👩‍💼", "🇬🇧", "✍️", "🚀", "🎨", "🔬", "⚖️", "💡", "🧠", "🧙‍♂️", "📊", "🎯"];

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 shrink-0">
                <Bot size={22} />
              </span>
              <div>
                <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {t("personas.hubTitle")}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("personas.hubSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all font-medium",
                    activeTab === "explore"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {t("personas.exploreTab")} ({personas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5",
                    activeTab === "create"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Plus size={13} /> {t("personas.createPrivateTab")} {myCustomCount > 0 && `(${myCustomCount})`}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                title={t("personas.closeEsc") || "Đóng (Esc)"}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Nội dung tab Khám phá */}
          {activeTab === "explore" ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
                  const Icon = cat.icon;
                  const isSel = selectedCategory === key;
                  let countBadge = null;
                  if (key === "official") countBadge = officialCount;
                  if (key === "custom") countBadge = myCustomCount;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedCategory(key)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all",
                        isSel
                          ? "bg-brand-500 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60"
                      )}
                    >
                      <Icon size={12} />
                      <span>{t(cat.labelKey) || cat.label}</span>
                      {countBadge !== null && (
                        <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", isSel ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300")}>
                          {countBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Grid Personas */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {/* Thanh giải thích giá trị thực tế */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-500/5 border border-brand-500/15 text-xs text-zinc-600 dark:text-zinc-400">
                  <Info size={16} className="text-brand-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{t("personas.whatIsTitle")}</strong> {t("personas.whatIsDesc")}
                  </p>
                </div>

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 size={24} className="animate-spin text-brand-500" />
                    <span className="text-xs">{t("personas.loading")}</span>
                  </div>
                ) : filteredPersonas.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400 space-y-2">
                    <p>{t("personas.emptyCategory")}</p>
                    {selectedCategory === "custom" && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("create")}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <Plus size={12} /> {t("personas.emptyCustomCta")}
                      </button>
                    )}
                  </div>
                ) : (

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPersonas.map((rawPersona) => {
                      const persona = getLocalizedPersona(rawPersona, t);
                      const isSys = Boolean(persona.isSystem);
                      return (
                        <div
                          key={persona.id}
                          onClick={() => {
                            onSelectPersona(persona);
                            onClose();
                          }}
                          className="group relative p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:border-brand-500/60 hover:bg-brand-500/5 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl p-2 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 shadow-xs flex items-center justify-center w-11 h-11 shrink-0">
                                  {persona.avatar || "🤖"}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                      {persona.name}
                                    </h4>
                                    {isSys ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <ShieldCheck size={11} /> {t("personas.officialBadge")}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        <Lock size={10} /> {t("personas.privateBadge")}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400 block mt-0.5">
                                    {persona.role}
                                  </span>
                                </div>
                              </div>

                              {!isSys && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeletePersona(e, persona.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-all shrink-0"
                                  title={t("personas.deleteTooltip") || "Xóa trợ lý riêng của bạn"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                              {persona.description || persona.systemPrompt}
                            </p>
                          </div>

                          {/* Câu hỏi mẫu */}
                          <div>
                            {persona.suggestedPrompts?.length > 0 && (
                              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
                                  {t("personas.examplePrompt")}
                                </span>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic truncate">
                                  &ldquo;{persona.suggestedPrompts[0]}&rdquo;
                                </p>
                              </div>
                            )}


                            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                              <span>{t("personas.startChat")}</span>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );

                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Form Tạo Trợ lý Riêng */
            <form onSubmit={handleCreatePersona} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {/* Thông báo bảo mật riêng tư */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {t("personas.privacyNotice")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {t("personas.formName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("personas.namePlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {t("personas.formRole")}
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder={t("personas.rolePlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t("personas.formAvatar")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewAvatar(emoji)}
                      className={clsx(
                        "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all",
                        newAvatar === emoji
                          ? "bg-brand-500 text-white shadow-xs scale-105"
                          : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t("personas.formDesc")}
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t("personas.descPlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("personas.formPrompt")}
                  </label>
                  <span className="text-[11px] text-zinc-400">{t("personas.formPromptSub")}</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder={t("personas.promptPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("personas.formSuggested")}
                  </label>
                  <span className="text-[11px] text-zinc-400">{t("personas.optional")}</span>
                </div>
                <textarea
                  rows={2}
                  value={newSuggestedPrompts}
                  onChange={(e) => setNewSuggestedPrompts(e.target.value)}
                  placeholder={t("personas.suggestedPlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {t("personas.btnBack")}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating && <Loader2 size={13} className="animate-spin" />}
                  <span>{creating ? t("personas.saving") : t("personas.btnSubmit")}</span>
                </button>
              </div>
            </form>
          )}

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
