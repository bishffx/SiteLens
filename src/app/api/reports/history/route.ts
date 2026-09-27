import { NextResponse } from "next/server";
import { defaultReportStorage } from "@/lib/reports";
import { HistoryQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const rawQuery = {
    url: urlObj.searchParams.get("url") || undefined,
    limit: urlObj.searchParams.get("limit") || 20,
  };

  const parsed = HistoryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { url, limit } = parsed.data;
  const history = await defaultReportStorage.listHistory(url, limit);

  return NextResponse.json({
    success: true,
    count: history.length,
    history,
  });
}
