import { NextResponse } from "next/server";
import { defaultJobService } from "@/lib/jobs";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Job ID parameter is required." },
      { status: 400 }
    );
  }

  const job = defaultJobService.getJob(id);

  if (!job) {
    return NextResponse.json(
      { success: false, error: `Analysis job '${id}' not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    job,
  });
}
