import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

function clearStoredSession() {
  localStorage.removeItem("chatai_token");
  localStorage.removeItem("chatai_refresh_token"); // dọn token cũ từ phiên bản trước
  localStorage.removeItem("chatai_user");
}

function storeSession(user, token) {
  localStorage.setItem("chatai_token", token);
  localStorage.setItem("chatai_user", JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("chatai_user");
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === "object" && typeof value.id === "string" ? value : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("chatai_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data.user);
      localStorage.setItem("chatai_user", JSON.stringify(res.data.data.user));
    } catch (err) {
      // A temporary API/network failure must not destroy a valid cached session.
      if (err.response?.status === 401 || err.response?.data?.error?.code === "USER_BANNED") {
        clearStoredSession();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password, rememberMe = false) => {
    const res = await api.post("/auth/login", { email, password, rememberMe });
    if (res.data.require2FA) {
      return {
        require2FA: true,
        challengeToken: res.data.challengeToken,
        emailMasked: res.data.emailMasked,
        message: res.data.message,
        devOtp: res.data.devOtp,
      };
    }
    const { user, token } = res.data.data;
    storeSession(user, token);
    setUser(user);
    return { require2FA: false, user };
  };

  const verify2FA = async (challengeToken, otp) => {
    const res = await api.post("/auth/verify-2fa", { challengeToken, otp });
    const { user, token } = res.data.data;
    storeSession(user, token);
    setUser(user);
    return user;
  };

  const resend2FA = async (challengeToken) => {
    const res = await api.post("/auth/resend-2fa", { challengeToken });
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post("/auth/register", { username, email, password });
    const { user, token } = res.data.data;
    storeSession(user, token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      // Refresh token nằm trong cookie httpOnly nên trình duyệt tự gửi kèm.
      await api.post("/auth/logout", {});
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      clearStoredSession();
      setUser(null);
    }
  };

  /** Lấy danh sách các phiên thiết bị đang hoạt động */
  const getSessions = async () => {
    const res = await api.get("/auth/sessions");
    return res.data?.data || { sessions: [], currentSessionId: null };
  };

  /** Đăng xuất khỏi một thiết bị cụ thể */
  const revokeSession = async (sessionId) => {
    const res = await api.delete(`/auth/sessions/${sessionId}`);
    return res.data;
  };

  /** Đăng xuất khỏi tất cả các thiết bị khác */
  const revokeAllOtherSessions = async () => {
    const res = await api.delete("/auth/sessions");
    return res.data;
  };

  /** Gọi backend tạo avatar hoạt hình ngẫu nhiên (DiceBear). */
  const randomizeAvatar = async () => {
    const res = await api.post("/auth/avatar/random");
    const next = res.data.data.user;
    localStorage.setItem("chatai_user", JSON.stringify(next));
    setUser(next);
    return next;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verify2FA,
        resend2FA,
        register,
        logout,
        getSessions,
        revokeSession,
        revokeAllOtherSessions,
        setUser,
        randomizeAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}