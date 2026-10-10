import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

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
        localStorage.removeItem("chatai_token");
        localStorage.removeItem("chatai_user");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { user, token } = res.data.data;
    localStorage.setItem("chatai_token", token);
    localStorage.setItem("chatai_user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const register = async (username, email, password) => {
    const res = await api.post("/auth/register", { username, email, password });
    const { user, token } = res.data.data;
    localStorage.setItem("chatai_token", token);
    localStorage.setItem("chatai_user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("chatai_token");
    localStorage.removeItem("chatai_user");
    setUser(null);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, randomizeAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
