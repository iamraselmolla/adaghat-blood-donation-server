import "express-async-errors";

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import { env } from "@/config/env";
import routes from "@/routes";
import { notFound } from "@/middlewares/notFound.middleware";
import { errorHandler } from "@/middlewares/error.middleware";

export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());

  // CORS - allow requests from any origin
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Security middleware
  app.use(mongoSanitize());
  app.use(hpp());

  // Logging in development
  if (!env.isProd) {
    app.use(morgan("dev"));
  }

  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(env.apiPrefix, globalLimiter);

  // API routes
  app.use(env.apiPrefix, routes);

  // 404 handler
  app.use(notFound);

  // Global error handler
  app.use(errorHandler);

  return app;
}