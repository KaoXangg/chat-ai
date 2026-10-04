import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AuthShell from "./components/AuthShell.jsx";
import BrandMark from "./components/BrandMark.jsx";

// Heavy pages are loaded on demand (code splitting): chat (markdown + syntax highlighter) and admin (charts).
const Chat = lazy(() => import("./pages/Chat.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.jsx"));
const AdminModels = lazy(() => import("./pages/admin/Models.jsx"));
const AdminConversations = lazy(() => import("./pages/admin/Conversations.jsx"));

const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

function PageFallback({ full }) {
  return (
    <div
      className={
        full
          ? "h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark"
          : "flex items-center justify-center min-h-[40vh]"
      }
    >
      <BrandMark size={44} className="animate-pulse" />
    </div>
  );
}

function Lazy({ children, full = false }) {
  return <Suspense fallback={<PageFallback full={full} />}>{children}</Suspense>;
}

/**
 * Kiến trúc chuyển trang:
 *  - Các trang auth là route con của <AuthShell/>: nền, khu thương hiệu, card, tab và nút ngôn ngữ chỉ mount
 *    một lần; chỉ vùng form được animate (xem AuthShell + AuthMotion). URL luôn là nguồn sự thật nên
 *    Back/Forward của trình duyệt hoạt động đúng và không cần tải lại ứng dụng.
 *  - Chuyển giữa khu vực auth <-> ứng dụng (đăng nhập xong / đăng xuất) chỉ fade opacity ngắn
 *    (không dùng transform để không phá position: fixed của modal trong Chat/Admin).
 *  - MotionConfig reducedMotion="user": người dùng bật "giảm chuyển động" sẽ chỉ còn fade, mọi dịch chuyển bị tắt.
 */
export default function App() {
  const location = useLocation();
  const section = AUTH_PATHS.has(location.pathname) ? "auth" : "app";

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={section}
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <Routes location={location}>
            <Route element={<AuthShell />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route
                path="/chat"
                element={
                  <Lazy full>
                    <Chat />
                  </Lazy>
                }
              />

              <Route element={<AdminRoute />}>
                <Route
                  path="/admin"
                  element={
                    <Lazy full>
                      <AdminLayout />
                    </Lazy>
                  }
                >
                  <Route index element={<Lazy><Dashboard /></Lazy>} />
                  <Route path="users" element={<Lazy><AdminUsers /></Lazy>} />
                  <Route path="models" element={<Lazy><AdminModels /></Lazy>} />
                  <Route path="conversations" element={<Lazy><AdminConversations /></Lazy>} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
