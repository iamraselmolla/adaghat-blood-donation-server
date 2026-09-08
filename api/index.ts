import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";

const app = createApp();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  app(req as never, res as never);
}
