import { NextResponse } from "next/server";
import { defaultReportStorage } from "@/lib/reports";
import { defaultJobStore } from "@/lib/jobs";
import { buildAuditReport } from "@/lib/reports/report-builder";
import type { AnalysisIssue } from "@/lib/types/analysis";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
  }

  let report = await defaultReportStorage.getReportById(id);
  if (!report) {
    // Check if id is a job in defaultJobStore
    const job = defaultJobStore.get(id);
    if (job && job.scoreResult) {
      const allIssues: AnalysisIssue[] = [];

      if (job.seoReport) {
        for (const chk of job.seoReport.checks.filter(
          (c) => c.status === "fail" || c.status === "warning"
        )) {
          allIssues.push({
            id: chk.checkId,
            category: "seo",
            severity: chk.severity === "critical" ? "critical" : "warning",
            title: chk.name,
            description: chk.explanation,
            recommendation: chk.recommendation || "",
            impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
          });
        }
      }

      if (job.performanceReport) {
        for (const iss of job.performanceReport.issues) {
          allIssues.push({
            id: iss.id,
            category: "performance",
            severity: iss.severity,
            title: iss.metric,
            description: iss.explanation,
            recommendation: iss.recommendation,
            impactScoreDeduction: iss.severity === "critical" ? 15 : 6,
          });
        }
      }

      if (job.accessibilityReport) {
        for (const f of job.accessibilityReport.findings.filter(
          (f) => f.type === "automatically_detectable"
        )) {
          allIssues.push({
            id: f.id,
            category: "accessibility",
            severity: f.severity,
            title: f.title,
            description: f.explanation,
            recommendation: f.recommendation,
            impactScoreDeduction: f.severity === "critical" ? 15 : 6,
          });
        }
      }

      if (job.contentReport) {
        for (const chk of job.contentReport.checks.filter(
          (c) => c.status === "fail" || c.status === "warning"
        )) {
          allIssues.push({
            id: chk.checkId,
            category: "content",
            severity: chk.severity === "critical" ? "critical" : "warning",
            title: chk.name,
            description: chk.explanation,
            recommendation: chk.recommendation || "",
            impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
          });
        }
      }

      if (job.mobileUxReport) {
        for (const f of job.mobileUxReport.findings.filter(
          (f) => f.status === "fail" || f.status === "warning"
        )) {
          allIssues.push({
            id: f.id,
            category: f.category,
            severity: f.severity === "critical" ? "critical" : "warning",
            title: f.title,
            description: f.explanation,
            recommendation: f.recommendation || "",
            impactScoreDeduction: f.severity === "critical" ? 15 : 6,
          });
        }
      }

      const centralAnalysis = {
        analyzedUrl: job.normalizedUrl || job.targetUrl,
        timestamp: job.completedAt || job.createdAt,
        allIssues,
        executionTimeMs: job.targetMetadata?.responseTimeMs || 0,
      };

      report = buildAuditReport({
        id: job.jobId,
        targetUrl: job.normalizedUrl || job.targetUrl,
        durationMs: job.targetMetadata?.responseTimeMs || 0,
        scores: job.scoreResult,
        analysis: centralAnalysis,
        aiInterpretation: job.aiReport,
        crawlerResult: job.crawlerResult,
        seoReport: job.seoReport,
        performanceReport: job.performanceReport,
        accessibilityReport: job.accessibilityReport,
        contentReport: job.contentReport,
        mobileUxReport: job.mobileUxReport,
      });

      try {
        await defaultReportStorage.saveReport(report);
      } catch {
        // non-fatal
      }
    }
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, report });
}
