import express from "express";
import cors from "cors";
import morgan from "morgan";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { requireObjectBody } from "./utils/validation.js";
import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import chatRoutes from "./routes/chat.js";
import modelRoutes from "./routes/models.js";
import adminRoutes from "./routes/admin.js";
import usageRoutes from "./routes/usage.js";
import preferencesRoutes from "./routes/preferences.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
  app.use("/api/chat", express.json({ limit: process.env.JSON_BODY_LIMIT_CHAT || "40mb" }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "100kb" }));
  app.use(requireObjectBody);
  if (process.env.HTTP_LOG_REQUESTS === "true") app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } }));
  app.use("/api/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/models", modelRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/usage", usageRoutes);
  app.use("/api/preferences", preferencesRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
