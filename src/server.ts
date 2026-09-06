import { createApp } from "@/app";
import { connectDB, disconnectDB } from "@/config/db";
import { env } from "@/config/env";

async function main() {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] LifeDrop API listening on port ${env.port} (${env.nodeEnv})`);
    // eslint-disable-next-line no-console
    console.log(`[server] Base URL: http://localhost:${env.port}${env.apiPrefix}`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("[server] Unhandled promise rejection:", reason);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
