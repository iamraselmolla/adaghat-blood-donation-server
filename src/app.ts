import express, { Express } from "express";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env";
import routes from "./routes/index";
import { notFound } from "./middleware/notFound.middleware";
import { errorHandler } from "./middleware/error.middleware";

export function createApp(): Express {
  const app = express();

  app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== "production") {
    app.use(morgan("dev"));
  }

  app.get("/", (_req, res) => {
    res.status(200).json({ name: "LifeDrop API", status: "running" });
  });

  app.use(env.apiPrefix, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
