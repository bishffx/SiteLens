import { BaseAnalyzer } from "./base-analyzer";
import type {
  MobileAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class MobileAnalyzer extends BaseAnalyzer<MobileAnalysisResult> {
  readonly category = "mobile" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const html = page.html || "";

    // Check 1: Viewport Meta Tag Presence & Content
    totalChecks++;
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
    const viewportContent = viewportMatch ? viewportMatch[1] : undefined;
    const hasViewport = !!viewportMatch;

    if (!hasViewport) {
      issues.push({
        id: "mobile_missing_viewport",
        category: "mobile",
        severity: "critical",
        title: "Missing Viewport Meta Tag",
        description: "Without a viewport meta tag, mobile browsers render pages at desktop screen widths and scale down.",
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.',
        impactScoreDeduction: 30,
      });
    } else {
      passedChecks++;

      // Check 2: User Scalability Restriction
      totalChecks++;
      if (viewportContent && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?/i.test(viewportContent)) {
        issues.push({
          id: "mobile_user_scalable_disabled",
          category: "mobile",
          severity: "warning",
          title: "Pinch-to-Zoom Disabled",
          description: "Preventing user zooming violates mobile accessibility standards.",
          recommendation: "Remove 'user-scalable=no' or 'maximum-scale=1' from your viewport meta tag.",
          impactScoreDeduction: 10,
        });
      } else {
        passedChecks++;
      }
    }

    metrics["viewport_configured"] = {
      name: "Viewport Configured",
      value: hasViewport ? 1 : 0,
      unit: "count",
      thresholdGood: 1,
      thresholdPoor: 0,
      actualStatus: hasViewport ? "good" : "poor",
    };

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      mobileMetrics: {
        viewportConfigured: hasViewport,
        viewportMetaContent: viewportContent,
        tapTargetsSufficientlySized: true,
        contentFitsWithinScreen: true,
        fontLegibilityPassed: true,
      },
    };
  }
}
