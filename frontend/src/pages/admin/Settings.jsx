import { useState, useEffect, useRef } from "react";
import { 
  Sliders, 
  KeyRound, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldAlert, 
  UserPlus, 
  Save, 
  Eye, 
  EyeOff, 
  Zap,
  Globe,
  Server,
  Download,
  Upload,
  Ban
} from "lucide-react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import clsx from "clsx";

export default function Settings() {
  const { t } = useI18n();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    allowRegistration: true,
    maintenanceMode: false,
    maintenanceMessage: "",
    globalSystemPrompt: "",
    defaultUserDailyTokens: 50000,
    rateLimitPerMinute: 30,
    blockedKeywords: "",
    hasGeminiKey: false,
    maskedGeminiKey: "",
    hasGroqKey: false,
    maskedGroqKey: "",
    hasOpenrouterKey: false,
    maskedOpenrouterKey: "",
    hasTavilyKey: false,
    maskedTavilyKey: "",
  });

  // Dynamic API Keys input (khi admin muốn thay key mới)
  const [newKeys, setNewKeys] = useState({
    geminiApiKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    tavilyApiKey: "",
  });

  const [showKey, setShowKey] = useState({
    gemini: false,
    groq: false,
    openrouter: false,
    tavily: false,
  });

  // Health check ping results
  const [healthStatus, setHealthStatus] = useState({
    gemini: { status: "unknown", latencyMs: null, message: "—" },
    groq: { status: "unknown", latencyMs: null, message: "—" },
    openrouter: { status: "unknown", latencyMs: null, message: "—" },
    tavily: { status: "unknown", latencyMs: null, message: "—" },
  });

  // Server resource metrics
  const [systemStatus, setSystemStatus] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/settings");
      if (res.data.success) {
        setSettings(res.data.data.settings);
      }
    } catch {
      toast.error("Không thể tải cấu hình hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const res = await api.get("/admin/system/status");
      if (res.data.success) {
        setSystemStatus(res.data.data);
      }
    } catch {
      // Bỏ qua lỗi status
    }
  };

  const handlePingAll = async () => {
    try {
      setPinging(true);
      const res = await api.post("/admin/health-check", {});
      if (res.data.success) {
        const nextStatus = {};
        res.data.data.results.forEach((r) => {
          nextStatus[r.provider] = r;
        });
        setHealthStatus(nextStatus);
        toast.success(t("settings.pingTitle"));
      }
    } catch {
      toast.error("Kiểm tra kết nối thất bại.");
    } finally {
      setPinging(false);
    }
  };

  const handlePingSingle = async (provider) => {
    try {
      setHealthStatus((prev) => ({
        ...prev,
        [provider]: { status: "pinging", latencyMs: null, message: t("settings.pinging") },
      }));
      const apiKey = newKeys[`${provider}ApiKey`]?.trim() || undefined;
      const res = await api.post("/admin/health-check", { provider, apiKey });
      if (res.data.success) {
        setHealthStatus((prev) => ({
          ...prev,
          [provider]: res.data.data.result,
        }));
        if (res.data.data.result.status === "ok") {
          toast.success(`${provider.toUpperCase()}: OK (${res.data.data.result.latencyMs}ms)`);
        } else {
          toast.error(`${provider.toUpperCase()}: ${res.data.data.result.error || "Error"}`);
        }
      }
    } catch (err) {
      setHealthStatus((prev) => ({
        ...prev,
        [provider]: { status: "error", latencyMs: null, error: err.message },
      }));
      toast.error(`Error ${provider}`);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        allowRegistration: settings.allowRegistration,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        globalSystemPrompt: settings.globalSystemPrompt,
        defaultUserDailyTokens: Number(settings.defaultUserDailyTokens),
        rateLimitPerMinute: Number(settings.rateLimitPerMinute),
        blockedKeywords: settings.blockedKeywords,
      };

      if (newKeys.geminiApiKey.trim()) payload.geminiApiKey = newKeys.geminiApiKey.trim();
      if (newKeys.groqApiKey.trim()) payload.groqApiKey = newKeys.groqApiKey.trim();
      if (newKeys.openrouterApiKey.trim()) payload.openrouterApiKey = newKeys.openrouterApiKey.trim();
      if (newKeys.tavilyApiKey.trim()) payload.tavilyApiKey = newKeys.tavilyApiKey.trim();

      const res = await api.patch("/admin/settings", payload);
      if (res.data.success) {
        toast.success(t("settings.saveChanges"));
        setNewKeys({ geminiApiKey: "", groqApiKey: "", openrouterApiKey: "", tavilyApiKey: "" });
        await loadSettings();
      }
    } catch {
      toast.error("Không thể lưu cài đặt hệ thống.");
    } finally {
      setSaving(false);
    }
  };

  // Sao lưu cấu hình ra file JSON
  const handleExportBackup = async () => {
    try {
      const res = await api.get("/admin/system/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `chat_ai_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("settings.backupBtn"));
    } catch {
      toast.error("Xuất sao lưu cấu hình thất bại.");
    }
  };

  // Phục hồi cấu hình từ file JSON
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRestoring(true);
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await api.post("/admin/system/import", { backupData });
      if (res.data.success) {
        toast.success(t("settings.restoreBtn"));
        await loadSettings();
        await loadSystemStatus();
      }
    } catch {
      toast.error("File sao lưu không đúng định dạng JSON.");
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    loadSettings();
    loadSystemStatus();
    handlePingAll();
  }, []);

  const blockedList = settings.blockedKeywords
    ? settings.blockedKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const handleRemoveKeyword = (kw) => {
    const updated = blockedList.filter((item) => item !== kw).join(", ");
    setSettings({ ...settings, blockedKeywords: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Tiêu đề & Nút lưu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Sliders className="text-brand-500" size={26} />
            {t("settings.pageTitle")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("settings.pageSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs shadow-xs transition-all"
            title="Download JSON backup"
          >
            <Download size={14} /> {t("settings.backupBtn")}
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs shadow-xs transition-all cursor-pointer">
            {restoring ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{t("settings.restoreBtn")}</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? t("settings.saving") : t("settings.saveChanges")}</span>
          </button>
        </div>
      </div>

      {/* Card Giám sát Server & Database Trực tiếp */}
      {systemStatus && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-brand-500" />
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                {t("settings.serverMonitorTitle")}
              </h2>
            </div>
            <button
              onClick={loadSystemStatus}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw size={12} /> {t("settings.refresh")}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-zinc-400 block mb-1">{t("settings.uptime")}</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm block">
                {systemStatus.server?.formattedUptime || "N/A"}
              </strong>
              <span className="text-[10px] text-emerald-500 font-medium">{t("settings.uptimeActive")}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-zinc-400 block mb-1">{t("settings.nodeHeap")}</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm block">
                {systemStatus.memory?.heapUsedMB} MB / {systemStatus.memory?.heapTotalMB} MB
              </strong>
              <span className="text-[10px] text-zinc-400">RSS: {systemStatus.memory?.rssMB} MB</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-zinc-400 block mb-1">{t("settings.hostRam")}</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm block">
                {systemStatus.memory?.systemUsedPercent}%
              </strong>
              <span className="text-[10px] text-zinc-400">Free: {systemStatus.memory?.systemFreeMemMB} MB</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-zinc-400 block mb-1">{t("settings.dbStatus")}</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm block">
                {systemStatus.database?.totalMessages?.toLocaleString()} msgs
              </strong>
              <span className="text-[10px] text-zinc-400">{systemStatus.database?.totalConversations} convs</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Kiểm tra Sức khỏe AI & Latency */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="text-brand-500" size={20} />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {t("settings.pingTitle")}
            </h2>
          </div>
          <button
            onClick={handlePingAll}
            disabled={pinging}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw size={13} className={pinging ? "animate-spin" : ""} />
            <span>{pinging ? t("settings.pinging") : t("settings.pingAllBtn")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            { id: "gemini", name: "Google Gemini", color: "from-blue-500/10 to-indigo-500/10" },
            { id: "groq", name: "Groq (Llama 3)", color: "from-amber-500/10 to-orange-500/10" },
            { id: "openrouter", name: "OpenRouter", color: "from-teal-500/10 to-emerald-500/10" },
            { id: "tavily", name: "Tavily Search", color: "from-purple-500/10 to-pink-500/10" },
          ].map(({ id, name }) => {
            const status = healthStatus[id];
            const isOk = status?.status === "ok";
            const isErr = status?.status === "error";
            const isUnconfigured = status?.status === "unconfigured";
            const isPinging = status?.status === "pinging";

            return (
              <div
                key={id}
                className={clsx(
                  "p-4 rounded-xl border flex flex-col justify-between transition-all",
                  isOk && "border-emerald-500/30 bg-emerald-500/5",
                  isErr && "border-red-500/30 bg-red-500/5",
                  isUnconfigured && "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30",
                  isPinging && "border-brand-500/30 bg-brand-500/5 animate-pulse"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{name}</span>
                  <button
                    onClick={() => handlePingSingle(id)}
                    className="text-[10px] text-zinc-400 hover:text-brand-500 transition-colors"
                    title="Ping"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>

                <div className="flex items-center gap-2 my-1">
                  {isOk && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                  {isErr && <AlertCircle size={16} className="text-red-500 shrink-0" />}
                  {isUnconfigured && <ShieldAlert size={16} className="text-zinc-400 shrink-0" />}
                  {isPinging && <Loader2 size={16} className="text-brand-500 animate-spin shrink-0" />}

                  <span className="text-xs font-semibold">
                    {isOk && `${status.latencyMs} ms`}
                    {isErr && "Error"}
                    {isUnconfigured && t("settings.notConfigured")}
                    {isPinging && "..."}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-1">
                  {status?.message || status?.error || "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Cấu hình Dynamic API Keys */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="text-brand-500" size={20} />
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("settings.apiKeysTitle")}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("settings.apiKeysSubtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[
            { id: "gemini", label: "Google Gemini API Key", keyField: "geminiApiKey", hasKey: settings.hasGeminiKey, masked: settings.maskedGeminiKey },
            { id: "groq", label: "Groq API Key (Llama 3)", keyField: "groqApiKey", hasKey: settings.hasGroqKey, masked: settings.maskedGroqKey },
            { id: "openrouter", label: "OpenRouter API Key", keyField: "openrouterApiKey", hasKey: settings.hasOpenrouterKey, masked: settings.maskedOpenrouterKey },
            { id: "tavily", label: "Tavily Search API Key", keyField: "tavilyApiKey", hasKey: settings.hasTavilyKey, masked: settings.maskedTavilyKey },
          ].map(({ id, label, keyField, hasKey, masked }) => (
            <div key={id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", hasKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400")}>
                  {hasKey ? `${t("settings.configured")} (${masked})` : t("settings.notConfigured")}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showKey[id] ? "text" : "password"}
                  value={newKeys[keyField]}
                  onChange={(e) => setNewKeys({ ...newKeys, [keyField]: e.target.value })}
                  placeholder="sk-..."
                  className="w-full pr-10 pl-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey({ ...showKey, [id]: !showKey[id] })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showKey[id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bộ lọc Từ khóa Nhạy cảm & Chống Spam/Lạm dụng */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="text-red-500" size={20} />
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {t("settings.blacklistTitle")}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("settings.blacklistSubtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t("settings.blacklistPlaceholder")}
            </label>
            <textarea
              rows={2}
              value={settings.blockedKeywords}
              onChange={(e) => setSettings({ ...settings, blockedKeywords: e.target.value })}
              placeholder="hack, ddos, spam, phishing..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          {blockedList.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                {t("settings.blockedWordsCount", { n: blockedList.length })}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {blockedList.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="opacity-60 hover:opacity-100 ml-1 text-red-500"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quản lý Đăng ký & Bảo trì */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="text-brand-500" size={20} />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("settings.registrationAndMaintenance")}</h2>
          </div>

          <div className="space-y-4 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer">
              <div>
                <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 block">{t("settings.allowRegLabel")}</span>
                <span className="text-[11px] text-zinc-500">{t("settings.allowRegDesc")}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer">
              <div>
                <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 block">{t("settings.maintenanceModeLabel")}</span>
                <span className="text-[11px] text-zinc-500">{t("settings.maintenanceModeDesc")}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
            </label>

            {settings.maintenanceMode && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("settings.maintenanceMsgLabel")}
                </label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                  placeholder="..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. Giới hạn Hạn ngạch & Rate Limit */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="text-brand-500" size={20} />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("settings.quotaAndRateTitle")}</h2>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t("settings.dailyLimitLabel")}
              </label>
              <input
                type="number"
                min={0}
                max={10000000}
                value={settings.defaultUserDailyTokens}
                onChange={(e) => setSettings({ ...settings, defaultUserDailyTokens: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
              <p className="text-[11px] text-zinc-400 mt-1">{t("settings.dailyLimitHint")}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t("settings.rateLimitLabel")}
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={settings.rateLimitPerMinute}
                onChange={(e) => setSettings({ ...settings, rateLimitPerMinute: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
              <p className="text-[11px] text-zinc-400 mt-1">{t("settings.rateLimitHint")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Lời dặn hệ thống chung (Global System Prompt) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="text-brand-500" size={20} />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {t("settings.globalPromptTitle")}
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("settings.globalPromptDesc")}
        </p>
        <textarea
          rows={3}
          value={settings.globalSystemPrompt}
          onChange={(e) => setSettings({ ...settings, globalSystemPrompt: e.target.value })}
          placeholder="..."
          className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-brand-500/20 outline-none leading-relaxed"
        />
      </div>
    </div>
  );
}
