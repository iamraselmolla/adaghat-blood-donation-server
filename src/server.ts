import { createApp } from "@/app";
import { connectDB } from "@/config/db";

const app = createApp();

export default async function handler(req: any, res: any) {
  try {
    await connectDB();

    return app(req, res);
  } catch (error) {
    console.error("[server] Request handler error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}