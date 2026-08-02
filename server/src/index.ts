import express from "express"; 
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { corsOptions } from "./config/cors";
import { generalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { scheduler } from "./jobs/scheduler";
import routes from "./routes";

const app = express();

// ─── Security Middleware ─────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
  stream: { write: (message) => logger.info(message.trim()) }
}));
app.use(generalLimiter);

// ─── Body Parsing ────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Health Check ────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      service: "Nexus AI API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// ─── API Routes ──────────────────────────────────
app.use("/api", routes);

// ─── Error Handling ──────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 Nexus AI API running on port ${env.PORT}`);
  logger.info(`📊 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Client URL: ${env.CLIENT_URL}`);

  scheduler.start().catch((err) => {
    logger.error("⚠️  Scheduler failed to start (non-fatal): " + err.message);
  });
});

export default app;
