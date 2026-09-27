import { NextResponse } from "next/server";
import { defaultJobService } from "@/lib/jobs";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Job ID parameter is required." },
      { status: 400 }
    );
  }

  const existingJob = defaultJobService.getJob(id);
  if (!existingJob) {
    return NextResponse.json(
      { success: false, error: `Analysis job '${id}' not found.` },
      { status: 404 }
    );
  }

  if (existingJob.status !== "completed") {
    return NextResponse.json(
      {
        success: false,
        error: "AI interpretation requires a completed analysis job.",
      },
      { status: 400 }
    );
  }

  const updatedJob = await defaultJobService.runAIInterpretation(id);

  return NextResponse.json({
    success: true,
    job: updatedJob,
    aiReport: updatedJob?.aiReport,
  });
}
