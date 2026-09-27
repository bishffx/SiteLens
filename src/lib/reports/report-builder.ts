import type {
  SiteLensAuditReport,
} from "../types/reports";
import type { CentralAnalysisResult } from "../types/analysis";
import type { DeterministicScoreResult } from "../types/scoring";
import type { AIInterpretationResult } from "../types/ai";
import { generateAuditId } from "../utils/id-generator";
import { normalizeUrl } from "../utils/url-helpers";

export interface BuildReportParams {
  id?: string;
  targetUrl: string;
  durationMs: number;
  scores: DeterministicScoreResult;
  analysis: CentralAnalysisResult;
  aiInterpretation?: AIInterpretationResult;
  crawlerResult?: import("../types/crawler").SinglePageCrawlResult;
  seoReport?: import("../seo/types").SEOAnalysisReport;
  performanceReport?: import("../performance/types").PerformanceAnalysisReport;
  accessibilityReport?: import("../accessibility/types").AccessibilityAnalysisReport;
  contentReport?: import("../content/types").ContentAnalysisReport;
  mobileUxReport?: import("../mobile-ux/types").MobileUXAnalysisReport;
}

export function buildAuditReport(params: BuildReportParams): SiteLensAuditReport {
  return {
    id: params.id || generateAuditId(),
    targetUrl: params.targetUrl,
    normalizedUrl: normalizeUrl(params.targetUrl),
    createdAt: new Date().toISOString(),
    durationMs: params.durationMs,
    scores: params.scores,
    analysis: params.analysis,
    aiInterpretation: params.aiInterpretation,
    crawlerResult: params.crawlerResult,
    seoReport: params.seoReport,
    performanceReport: params.performanceReport,
    accessibilityReport: params.accessibilityReport,
    contentReport: params.contentReport,
    mobileUxReport: params.mobileUxReport,
    meta: {
      appVersion: "0.1.0",
      userAgent: "SiteLens-Engine/1.0",
      environment: process.env.NODE_ENV || "development",
    },
  };
}
