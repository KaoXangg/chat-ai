import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const REMEMBER_EMAIL_KEY = "chatai_remember_email";
export const REMEMBER_ME_KEY = "chatai_remember_me";

const AuthDraftContext = createContext(null);

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Giữ email đang nhập khi người dùng chuyển qua lại Đăng nhập / Đăng ký / Quên mật khẩu.
 * Mật khẩu KHÔNG được lưu ở đây (chỉ nằm trong state của từng trang).
 */
export function AuthDraftProvider({ children }) {
  const [email, setEmailState] = useState(readRememberedEmail);
  const setEmail = useCallback((value) => setEmailState(value), []);
  const value = useMemo(() => ({ email, setEmail }), [email, setEmail]);
  return <AuthDraftContext.Provider value={value}>{children}</AuthDraftContext.Provider>;
}

export function useAuthEmail() {
  const ctx = useContext(AuthDraftContext);
  const [localEmail, setLocalEmail] = useState("");
  // Dự phòng: nếu trang được render ngoài AuthShell thì vẫn hoạt động như state thường.
  if (!ctx) return [localEmail, setLocalEmail];
  return [ctx.email, ctx.setEmail];
}
