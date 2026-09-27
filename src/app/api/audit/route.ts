import { NextResponse } from "next/server";
import { AuditRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = AuditRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid audit request payload",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const validatedRequest = parseResult.data;

    return NextResponse.json({
      success: true,
      message: "Audit request accepted and validated by foundational architecture.",
      request: validatedRequest,
      status: "ready_for_crawler",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
