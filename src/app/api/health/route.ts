import { NextResponse } from "next/server";
import { defaultAIService } from "@/lib/ai";

export async function GET() {
  const aiHealth = await defaultAIService.checkHealth();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
    },
    services: {
      aiProvider: aiHealth,
      storage: {
        status: "ready",
        driver: "file-system",
      },
    },
  });
}
