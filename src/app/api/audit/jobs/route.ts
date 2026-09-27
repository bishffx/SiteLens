import { NextResponse } from "next/server";
import { defaultJobService, defaultJobStore } from "@/lib/jobs";
import type { CreateJobRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateJobRequest;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Expected JSON object with 'url'.",
        },
        { status: 400 }
      );
    }

    const job = await defaultJobService.createJob({
      url: body.url,
      deviceType: body.deviceType,
      enabledCategories: body.enabledCategories,
      requestAI: body.requestAI,
    });

    const statusCode = job.status === "failed" ? 400 : 201;

    return NextResponse.json(
      {
        success: job.status !== "failed",
        job,
      },
      { status: statusCode }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred while creating the analysis job.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
  const jobs = defaultJobStore.list(limit);

  return NextResponse.json({
    success: true,
    count: jobs.length,
    jobs,
  });
}
