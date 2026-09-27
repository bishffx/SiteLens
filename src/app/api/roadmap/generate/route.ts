import { NextResponse } from 'next/server';
import { defaultReportStorage } from '@/lib/reports';
import { defaultRoadmapStorage, buildRoadmapFromReport } from '@/lib/roadmap';
import { z } from 'zod';

// Request schema for generating a roadmap
const GenerateSchema = z.object({
  reportId: z.string(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = GenerateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const { reportId } = parsed.data;
    // Load the audit report
    const report = await defaultReportStorage.getReportById(reportId);
    if (!report) {
      return NextResponse.json({ error: `Report '${reportId}' not found` }, { status: 404 });
    }
    // Check if a roadmap already exists
    let roadmap = await defaultRoadmapStorage.getRoadmapByReportId(reportId);
    if (!roadmap) {
      roadmap = buildRoadmapFromReport(report);
      await defaultRoadmapStorage.saveRoadmap(roadmap);
    }
    return NextResponse.json({ success: true, roadmap });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Roadmap generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
