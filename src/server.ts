import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  // eslint-disable-next-line no-console
  console.log("MongoDB connected");

  const app = createApp();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`LifeDrop API listening on port ${env.port} (${env.nodeEnv})`);
    // eslint-disable-next-line no-console
    console.log(`API base: http://localhost:${env.port}${env.apiPrefix}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
