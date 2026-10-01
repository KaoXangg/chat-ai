import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useRef } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import BrandMark from "./components/BrandMark.jsx";

// Heavy pages are loaded on demand (code splitting): chat (markdown + syntax highlighter) and admin (charts).
const Chat = lazy(() => import("./pages/Chat.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.jsx"));
const AdminModels = lazy(() => import("./pages/admin/Models.jsx"));
const AdminConversations = lazy(() => import("./pages/admin/Conversations.jsx"));

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

const AUTH_ORDER = { "/login": 0, "/register": 1, "/forgot-password": 2, "/reset-password": 3 };

function PageFade({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

/** Directional slide used only between auth pages (login/register/forgot/reset) for a premium "swap" feel. */
function AuthPageSlide({ direction, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const isAuthNow = AUTH_ORDER[location.pathname] !== undefined;
  const isAuthPrev = AUTH_ORDER[prevPathRef.current] !== undefined;
  const direction =
    isAuthNow && isAuthPrev ? Math.sign(AUTH_ORDER[location.pathname] - AUTH_ORDER[prevPathRef.current]) || 1 : 1;

  prevPathRef.current = location.pathname;

  const Wrap = isAuthNow && isAuthPrev ? ({ children }) => <AuthPageSlide direction={direction}>{children}</AuthPageSlide> : PageFade;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <Wrap>
              <Login />
            </Wrap>
          }
        />
        <Route
          path="/register"
          element={
            <Wrap>
              <Register />
            </Wrap>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Wrap>
              <ForgotPassword />
            </Wrap>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Wrap>
              <ResetPassword />
            </Wrap>
          }
        />

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
    </AnimatePresence>
  );
}