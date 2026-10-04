import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { dictionaries, UI_CODES } from "./dictionaries.js";
import { AI_AUTO, DEFAULT_LANG, LANGUAGE_MAP, isRtl } from "./languages.js";

const STORAGE_KEY = "chatai_lang";

const I18nContext = createContext(null);

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
}

/** Tìm chuỗi theo thứ tự: ngôn ngữ hiện tại -> ngôn ngữ gốc (zh-CN -> zh) -> tiếng Anh -> tiếng Việt. */
function lookup(lang, key) {
  const chain = [lang, lang.split("-")[0], "en", DEFAULT_LANG];
  for (const code of chain) {
    const value = dictionaries[code]?.[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && UI_CODES.has(saved)) return saved;
  } catch {
    /* localStorage không khả dụng */
  }
  const preferred = typeof navigator !== "undefined" ? navigator.languages || [navigator.language] : [];
  for (const raw of preferred) {
    if (!raw) continue;
    if (UI_CODES.has(raw)) return raw;
    const base = raw.split("-")[0];
    if (UI_CODES.has(base)) return base;
    // Mã gốc không có từ điển riêng (vd. "zh") nhưng có biến thể vùng (vd. "zh-CN") -> dùng biến thể đó.
    const regional = [...UI_CODES].find((code) => code.split("-")[0] === base);
    if (regional) return regional;
  }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [lang, setLangState] = useState(detectLanguage);
  const [aiLang, setAiLangState] = useState(AI_AUTO);

  const langRef = useRef(lang);
  const aiLangRef = useRef(aiLang);
  const userIdRef = useRef(userId);
  langRef.current = lang;
  aiLangRef.current = aiLang;
  userIdRef.current = userId;

  // Ngôn ngữ + chiều chữ (RTL cho Ả Rập, Do Thái, Ba Tư, Urdu) + tiêu đề tab.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
    const title = lookup(lang, "app.title");
    if (title) document.title = title;
  }, [lang]);

  // Đồng bộ với tài khoản: lấy lựa chọn đã lưu trên server khi đăng nhập.
  useEffect(() => {
    if (!userId) {
      setAiLangState(AI_AUTO);
      return undefined;
    }
    let cancelled = false;
    api
      .get("/preferences")
      .then((res) => {
        if (cancelled) return;
        const { uiLanguage, aiLanguage } = res.data.data;
        if (uiLanguage && UI_CODES.has(uiLanguage)) {
          setLangState(uiLanguage);
          try {
            localStorage.setItem(STORAGE_KEY, uiLanguage);
          } catch {
            /* bỏ qua */
          }
        } else {
          // Tài khoản chưa có lựa chọn: lưu ngôn ngữ đang dùng (đã chọn trước khi đăng nhập).
          api.patch("/preferences", { uiLanguage: langRef.current }).catch(() => {});
        }
        setAiLangState(aiLanguage || AI_AUTO);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setLang = useCallback((code) => {
    if (!UI_CODES.has(code)) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* bỏ qua */
    }
    if (userIdRef.current) api.patch("/preferences", { uiLanguage: code }).catch(() => {});
  }, []);

  /** Ngôn ngữ AI trả lời được áp dụng ở server nên phải lưu thành công; lỗi thì hoàn tác và ném lại. */
  const setAiLang = useCallback(async (code) => {
    if (code !== AI_AUTO && !LANGUAGE_MAP.has(code)) return;
    const previous = aiLangRef.current;
    setAiLangState(code);
    try {
      await api.patch("/preferences", { aiLanguage: code });
    } catch (err) {
      setAiLangState(previous);
      throw err;
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const value = lookup(lang, key);
      return value === undefined ? key : interpolate(value, vars);
    },
    [lang]
  );

  /** Thông báo lỗi API theo ngôn ngữ giao diện: ưu tiên mã lỗi -> thông điệp server -> khóa dự phòng. */
  const errorMessage = useCallback(
    (err, fallbackKey = "error.generic") => {
      const code = err?.response?.data?.error?.code;
      const byCode = code ? lookup(lang, `error.${code}`) : undefined;
      if (byCode) return byCode;
      if (err && !err.response) return lookup(lang, "error.NETWORK") || lookup(lang, "error.generic") || fallbackKey;
      return err?.response?.data?.error?.message || lookup(lang, fallbackKey) || lookup(lang, "error.generic");
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, aiLang, setAiLang, t, errorMessage, dir: isRtl(lang) ? "rtl" : "ltr" }),
    [lang, setLang, aiLang, setAiLang, t, errorMessage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n phải được dùng bên trong <I18nProvider>.");
  return ctx;
}