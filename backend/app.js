import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { requireObjectBody } from "./utils/validation.js";
import { ForbiddenError } from "./utils/AppError.js";
import { sequelize } from "./config/db.js";
import { apiLimiter, shareLimiter } from "./middleware/rateLimit.js";

import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import chatRoutes from "./routes/chat.js";
import modelRoutes from "./routes/models.js";
import adminRoutes from "./routes/admin.js";
import usageRoutes from "./routes/usage.js";
import preferencesRoutes from "./routes/preferences.js";
import shareRoutes from "./routes/share.js";
import folderRoutes from "./routes/folders.js";
import personaRoutes from "./routes/personas.js";
import announcementRoutes from "./routes/announcements.js";

async function checkDbHealth(timeoutMs = 3000) {
  try {
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), timeoutMs)
    );
    await Promise.race([authPromise, timeoutPromise]);
    return "up";
  } catch {
    return "down";
  }
}

export function createApp() {
  const app = express();

  // 1. Trust proxy configuration
  const proxySetting = process.env.TRUST_PROXY;
  if (proxySetting === "true") {
    app.set("trust proxy", true);
  } else if (/^\d+$/.test(proxySetting || "") && Number(proxySetting) > 0) {
    app.set("trust proxy", Number(proxySetting));
  } else {
    app.set("trust proxy", false);
  }

  // 2. Helmet - Hardened HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https:", "wss:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // 3. Compression - Skip compression for Server-Sent Events (SSE / text/event-stream)
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers.accept && req.headers.accept.includes("text/event-stream")) {
          return false;
        }
        const contentType = res.getHeader("Content-Type");
        if (typeof contentType === "string" && contentType.includes("text/event-stream")) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );

  // 4. CORS Whitelist
  const isDev = process.env.NODE_ENV !== "production";
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.CLIENT_URL && !configuredOrigins.includes(process.env.CLIENT_URL.trim())) {
    configuredOrigins.push(process.env.CLIENT_URL.trim());
  }

  const defaultDevOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Cho phép các yêu cầu không có header Origin (curl, Postman, health check)
        if (!origin) return callback(null, true);

        const allowedOrigins = [...configuredOrigins];

        if (isDev) {
          if (!allowedOrigins.length) {
            allowedOrigins.push(...defaultDevOrigins);
          }
          if (
            allowedOrigins.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:") ||
            origin.startsWith("http://192.168.") ||
            origin.startsWith("http://10.") ||
            origin.startsWith("http://172.") ||
            origin.endsWith(".loca.lt") ||
            origin.endsWith(".trycloudflare.com")
          ) {
            return callback(null, true);
          }
        } else {
          // Production: Chỉ cho phép các origin nằm trong whitelist
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(
            new ForbiddenError("CORS_NOT_ALLOWED", "Nguồn gốc yêu cầu (Origin) không được phép truy cập API.")
          );
        }

        callback(
          new ForbiddenError("CORS_NOT_ALLOWED", "Nguồn gốc yêu cầu (Origin) không được phép truy cập API.")
        );
      },
      credentials: true,
    })
  );

  // 5. Health Check endpoints (placed BEFORE rate limits & auth)
  const healthCheckHandler = async (req, res) => {
    const dbStatus = await checkDbHealth();
    const uptime = Math.floor(process.uptime());
    const timestamp = new Date().toISOString();

    if (dbStatus === "down") {
      return res.status(503).json({
        status: "degraded",
        uptime,
        timestamp,
        db: "down",
      });
    }

    return res.status(200).json({
      status: "ok",
      uptime,
      timestamp,
      db: "up",
    });
  };

  app.get("/health", healthCheckHandler);
  app.get("/api/health", healthCheckHandler);

  // 6. Global Cookie Parser & Body Parser
  app.use(cookieParser());
  app.use("/api/chat", express.json({ limit: process.env.JSON_BODY_LIMIT_CHAT || "40mb" }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
  app.use(requireObjectBody);

  if (process.env.HTTP_LOG_REQUESTS === "true") {
    app.use(morgan("dev"));
  }

  // 7. Global API Rate Limiter
  app.use("/api", apiLimiter);

  // 8. Application Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/models", modelRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/usage", usageRoutes);
  app.use("/api/preferences", preferencesRoutes);
  app.use("/api/share", shareLimiter, shareRoutes);
  app.use("/api/folders", folderRoutes);
  app.use("/api/personas", personaRoutes);
  app.use("/api/announcements", announcementRoutes);

  // 9. Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}