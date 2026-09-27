import { BaseAnalyzer } from "./base-analyzer";
import type {
  PerformanceAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class PerformanceAnalyzer extends BaseAnalyzer<PerformanceAnalysisResult> {
  readonly category = "performance" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const timing = page.timing || {
      dnsLookupTimeMs: 0,
      tcpConnectTimeMs: 0,
      tlsHandshakeTimeMs: 0,
      timeToFirstByteMs: 0,
      domContentLoadedTimeMs: 0,
      loadCompleteTimeMs: 0,
    };

    const resources = page.resources || { scripts: [], stylesheets: [], images: [] };
    const htmlSizeBytes = Buffer.byteLength(page.html || "", "utf8");

    // Check 1: Time To First Byte (TTFB)
    totalChecks++;
    const ttfb = timing.timeToFirstByteMs;
    metrics["ttfb"] = {
      name: "Time To First Byte",
      value: ttfb,
      unit: "ms",
      thresholdGood: 800,
      thresholdPoor: 1800,
      actualStatus: ttfb <= 800 ? "good" : ttfb <= 1800 ? "needs-improvement" : "poor",
    };

    if (ttfb > 1800) {
      issues.push({
        id: "perf_high_ttfb",
        category: "performance",
        severity: "critical",
        title: "Slow Time To First Byte (TTFB)",
        description: `Server responded with a TTFB of ${ttfb}ms, exceeding the 1800ms poor threshold.`,
        recommendation: "Optimize server backend processing, database query performance, or introduce edge caching/CDN.",
        impactScoreDeduction: 20,
      });
    } else if (ttfb > 800) {
      issues.push({
        id: "perf_moderate_ttfb",
        category: "performance",
        severity: "warning",
        title: "Suboptimal Time To First Byte",
        description: `TTFB was ${ttfb}ms. Ideal response time is under 800ms.`,
        recommendation: "Consider enabling page caching or using a closer CDN edge node.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 2: HTML Document Payload Size
    totalChecks++;
    metrics["html_size"] = {
      name: "HTML Document Size",
      value: htmlSizeBytes,
      unit: "bytes",
      thresholdGood: 100000, // 100 KB
      thresholdPoor: 300000, // 300 KB
      actualStatus: htmlSizeBytes <= 100000 ? "good" : htmlSizeBytes <= 300000 ? "needs-improvement" : "poor",
    };

    if (htmlSizeBytes > 300000) {
      issues.push({
        id: "perf_large_html_payload",
        category: "performance",
        severity: "warning",
        title: "Excessive Initial HTML Size",
        description: `Initial HTML document size is ${Math.round(htmlSizeBytes / 1024)} KB. Large payloads delay parsing and rendering.`,
        recommendation: "Remove inlined base64 assets, reduce excessive inline scripts, or paginate content.",
        impactScoreDeduction: 15,
      });
    } else {
      passedChecks++;
    }

    // Check 3: Excessive External Scripts
    totalChecks++;
    const scriptCount = resources.scripts?.length || 0;
    if (scriptCount > 20) {
      issues.push({
        id: "perf_excessive_scripts",
        category: "performance",
        severity: "warning",
        title: "Excessive External Scripts",
        description: `Detected ${scriptCount} external script references. Too many scripts block rendering and increase thread contention.`,
        recommendation: "Consolidate bundles, defer non-essential scripts, or load third-party scripts asynchronously.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 4: Unoptimized Image References
    totalChecks++;
    const images = resources.images || [];
    const missingDimensions = images.filter((img) => !img.naturalWidth || !img.naturalHeight).length;
    if (missingDimensions > 0 && images.length > 0) {
      issues.push({
        id: "perf_images_missing_dimensions",
        category: "performance",
        severity: "warning",
        title: "Images Without Explicit Dimensions",
        description: `${missingDimensions} images lack explicit width/height dimensions, which causes layout shifts (CLS).`,
        recommendation: "Specify width and height attributes or CSS aspect-ratio on all <img> elements.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      networkMetrics: {
        totalTransferSizeBytes: htmlSizeBytes,
        resourceCounts: {
          scripts: scriptCount,
          stylesheets: resources.stylesheets?.length || 0,
          images: images.length,
          fonts: 0,
          other: 0,
        },
        timeToFirstByteMs: ttfb,
        domContentLoadedMs: timing.domContentLoadedTimeMs,
        loadCompleteMs: timing.loadCompleteTimeMs,
      },
    };
  }
}
