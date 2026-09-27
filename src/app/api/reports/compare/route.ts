import { NextResponse } from "next/server";
import { defaultReportStorage, defaultComparisonEngine } from "@/lib/reports";
import { ReportCompareRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = ReportCompareRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid comparison request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { baselineAuditId, currentAuditId } = parsed.data;

    const [baseline, current] = await Promise.all([
      defaultReportStorage.getReportById(baselineAuditId),
      defaultReportStorage.getReportById(currentAuditId),
    ]);

    if (!baseline) {
      return NextResponse.json(
        { error: `Baseline audit '${baselineAuditId}' not found` },
        { status: 404 }
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: `Current audit '${currentAuditId}' not found` },
        { status: 404 }
      );
    }

    const comparison = defaultComparisonEngine.compare(baseline, current);

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Comparison failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
