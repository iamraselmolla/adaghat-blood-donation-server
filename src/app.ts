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

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser tools (curl, mobile) with no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(mongoSanitize());
  app.use(hpp());

  if (!env.isProd) {
    app.use(morgan("dev"));
  }

  const globalLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(env.apiPrefix, globalLimiter);

  app.use(env.apiPrefix, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
