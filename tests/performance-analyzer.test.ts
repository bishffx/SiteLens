import { describe, it } from "node:test";
import assert from "node:assert";
import {
  DeterministicPerformanceAnalyzer,
  defaultDeterministicPerformanceAnalyzer,
} from "../src/lib/performance/performance-analyzer";
import { evaluatePerformanceSignals } from "../src/lib/performance/performance-rules";
import { LighthouseRunner, type LighthouseExecutionResult } from "../src/lib/performance/lighthouse-runner";
import type { SinglePageCrawlResult } from "../src/lib/types/crawler";

function createMockCrawlResult(overrides?: Partial<SinglePageCrawlResult>): SinglePageCrawlResult {
  return {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    httpStatus: 200,
    statusText: "OK",
    pageTitle: "Example Domain",
    html: "<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>",
    metaDescription: "An example description for testing.",
    canonicalUrl: "https://example.com/",
    headings: {
      h1: ["Hello"],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      all: [{ level: "h1", text: "Hello" }],
    },
    links: [],
    images: [
      { src: "/hero.png", alt: "Hero", loading: "eager", width: 1200, height: 600 },
      { src: "/thumb1.png", alt: "Thumb 1", loading: "lazy", width: 300, height: 200 },
    ],
    robots: { metaRobots: "index, follow", directives: ["index", "follow"] },
    viewport: {
      metaViewport: "width=device-width, initial-scale=1",
      hasWidthDeviceWidth: true,
      hasInitialScale: true,
      userScalableDisabled: false,
    },
    language: "en",
    openGraph: {},
    twitter: {},
    structuredData: [],
    textContent: "Hello world",
    resources: {
      scripts: [
        { src: "/main.js", isAsync: true, isDefer: false, isModule: false },
        { src: "/analytics.js", isAsync: false, isDefer: true, isModule: false },
      ],
      stylesheets: [
        { href: "/styles.css" },
      ],
      totalScriptsCount: 2,
      totalStylesheetsCount: 1,
      totalImagesCount: 2,
    },
    timing: {
      dnsLookupMs: 25,
      tcpConnectMs: 30,
      tlsHandshakeMs: 45,
      timeToFirstByteMs: 180,
      domContentLoadedMs: 450,
      loadCompleteMs: 820,
    },
    redirectChain: [],
    headers: { "content-type": "text/html; charset=utf-8" },
    isJavaScriptRendered: true,
    capturedAt: new Date().toISOString(),
    errors: [],
    ...overrides,
  };
}

function createMockLighthouseResult(overrides?: Partial<LighthouseExecutionResult>): LighthouseExecutionResult {
  return {
    isAvailable: true,
    version: "13.5.0",
    error: null,
    performanceScore: 98,
    rawLhr: { lighthouseVersion: "13.5.0", audits: {} },
    metrics: {
      fcpMs: 850,
      lcpMs: 1200,
      cls: 0.02,
      tbtMs: 45,
      inpMs: 80,
      speedIndexMs: 1100,
      totalByteWeight: 245000,
    },
    details: {
      renderBlockingResourcesCount: 0,
      unsizedImagesCount: 0,
      domElementCount: 120,
    },
    ...overrides,
  };
}

describe("SiteLens Performance Analyzer - Deterministic Rules", () => {
  it("should evaluate fast Core Web Vitals as good without generating issues", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult();

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    // Vitals status assertions
    assert.strictEqual(evaluation.metrics.lcp.status, "good");
    assert.strictEqual(evaluation.metrics.fcp.status, "good");
    assert.strictEqual(evaluation.metrics.cls.status, "good");
    assert.strictEqual(evaluation.metrics.tbt.status, "good");
    assert.strictEqual(evaluation.metrics.ttfb.status, "good");
    assert.strictEqual(evaluation.metrics.speedIndex.status, "good");

    // Zero critical or warning issues on fast clean site
    assert.strictEqual(evaluation.summary.criticalCount, 0);
    assert.strictEqual(evaluation.summary.warningCount, 0);
    assert.ok(evaluation.summary.passedAudits > 0);
  });

  it("should flag slow LCP (> 4.0s) as a critical issue", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult({
      metrics: {
        fcpMs: 1200,
        lcpMs: 4600, // Slow LCP
        cls: 0.01,
        tbtMs: 50,
        inpMs: null,
        speedIndexMs: 2000,
        totalByteWeight: 500000,
      },
    });

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.metrics.lcp.status, "poor");
    const lcpIssue = evaluation.issues.find((i) => i.id === "perf_lcp_slow");
    assert.ok(lcpIssue, "Must generate perf_lcp_slow issue");
    assert.strictEqual(lcpIssue.severity, "critical");
    assert.ok(lcpIssue.metric.includes("4.60s"));
    assert.ok(lcpIssue.recommendation.length > 0);
  });

  it("should flag moderate LCP (2.5s - 4.0s) as a warning issue", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult({
      metrics: {
        fcpMs: 1200,
        lcpMs: 3100, // Moderate LCP
        cls: 0.01,
        tbtMs: 50,
        inpMs: null,
        speedIndexMs: 2000,
        totalByteWeight: 500000,
      },
    });

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.metrics.lcp.status, "needs-improvement");
    const lcpIssue = evaluation.issues.find((i) => i.id === "perf_lcp_moderate");
    assert.ok(lcpIssue, "Must generate perf_lcp_moderate warning issue");
    assert.strictEqual(lcpIssue.severity, "warning");
  });

  it("should flag high CLS (> 0.25) as a critical issue", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult({
      metrics: {
        fcpMs: 800,
        lcpMs: 1200,
        cls: 0.38, // Poor CLS
        tbtMs: 50,
        inpMs: null,
        speedIndexMs: 1000,
        totalByteWeight: 200000,
      },
    });

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.metrics.cls.status, "poor");
    const clsIssue = evaluation.issues.find((i) => i.id === "perf_cls_high");
    assert.ok(clsIssue, "Must generate perf_cls_high issue");
    assert.strictEqual(clsIssue.severity, "critical");
  });

  it("should flag high TBT (> 600ms) as a critical issue", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult({
      metrics: {
        fcpMs: 800,
        lcpMs: 1200,
        cls: 0.01,
        tbtMs: 850, // Poor TBT
        inpMs: null,
        speedIndexMs: 1500,
        totalByteWeight: 200000,
      },
    });

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.metrics.tbt.status, "poor");
    const tbtIssue = evaluation.issues.find((i) => i.id === "perf_tbt_high");
    assert.ok(tbtIssue, "Must generate perf_tbt_high issue");
    assert.strictEqual(tbtIssue.severity, "critical");
  });

  it("should flag slow TTFB (> 1800ms) from real crawler navigation timing", () => {
    const crawl = createMockCrawlResult({
      timing: {
        dnsLookupMs: 50,
        tcpConnectMs: 80,
        tlsHandshakeMs: 120,
        timeToFirstByteMs: 2200, // Very slow server response
        domContentLoadedMs: 2800,
        loadCompleteMs: 3400,
      },
    });
    const lh = createMockLighthouseResult();

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.metrics.ttfb.status, "poor");
    const ttfbIssue = evaluation.issues.find((i) => i.id === "perf_ttfb_slow");
    assert.ok(ttfbIssue, "Must generate perf_ttfb_slow issue");
    assert.strictEqual(ttfbIssue.severity, "critical");
  });

  it("should detect render-blocking external scripts", () => {
    const crawl = createMockCrawlResult({
      resources: {
        scripts: [
          // Synchronous external scripts (blocking)
          { src: "https://cdn.example.com/app.js", isAsync: false, isDefer: false, isModule: false },
          { src: "https://cdn.example.com/vendor.js", isAsync: false, isDefer: false, isModule: false },
        ],
        stylesheets: [],
        totalScriptsCount: 2,
        totalStylesheetsCount: 0,
        totalImagesCount: 0,
      },
    });
    const lh = createMockLighthouseResult();

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.resources.renderBlockingScripts, 2);
    const rbIssue = evaluation.issues.find((i) => i.id === "perf_render_blocking_scripts");
    assert.ok(rbIssue, "Must flag render-blocking scripts");
    assert.strictEqual(rbIssue.severity, "warning");
  });

  it("should detect images missing explicit width/height dimensions", () => {
    const crawl = createMockCrawlResult({
      images: [
        { src: "/banner.jpg", alt: "Banner", loading: null, width: null, height: null },
        { src: "/card.jpg", alt: "Card", loading: null, width: null, height: null },
      ],
    });
    const lh = createMockLighthouseResult();

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    assert.strictEqual(evaluation.resources.imagesWithoutDimensions, 2);
    const dimIssue = evaluation.issues.find((i) => i.id === "perf_images_missing_dimensions");
    assert.ok(dimIssue, "Must flag unsized images causing CLS");
  });

  it("should detect excessive page weight (> 5MB)", () => {
    const crawl = createMockCrawlResult();
    const lh = createMockLighthouseResult({
      metrics: {
        fcpMs: 800,
        lcpMs: 1200,
        cls: 0.01,
        tbtMs: 50,
        inpMs: null,
        speedIndexMs: 1000,
        totalByteWeight: 6.5 * 1024 * 1024, // 6.5 MB
      },
    });

    const evaluation = evaluatePerformanceSignals(crawl, lh);

    const weightIssue = evaluation.issues.find((i) => i.id === "perf_excessive_page_weight");
    assert.ok(weightIssue, "Must flag excessive page weight");
    assert.strictEqual(weightIssue.severity, "warning");
  });
});

describe("SiteLens Performance Analyzer - Explicit Metric Availability", () => {
  it("should mark Lighthouse-only metrics as unavailable when Lighthouse cannot run, without inventing fake values", async () => {
    const crawl = createMockCrawlResult({
      timing: {
        dnsLookupMs: 20,
        tcpConnectMs: 30,
        tlsHandshakeMs: 40,
        timeToFirstByteMs: 150,
        domContentLoadedMs: 400,
        loadCompleteMs: 800,
      },
    });

    const analyzer = new DeterministicPerformanceAnalyzer();
    const report = await analyzer.analyze(crawl, {
      skipLighthouse: true,
    });

    // Lighthouse status
    assert.strictEqual(report.lighthouse.isAvailable, false);
    assert.strictEqual(report.lighthouse.performanceScore, null);

    // Lighthouse-only metrics MUST be explicitly marked unavailable
    assert.strictEqual(report.metrics.lcp.available, false);
    assert.strictEqual(report.metrics.lcp.status, "unavailable");
    assert.strictEqual(report.metrics.lcp.value, null);

    assert.strictEqual(report.metrics.fcp.available, false);
    assert.strictEqual(report.metrics.fcp.status, "unavailable");
    assert.strictEqual(report.metrics.fcp.value, null);

    assert.strictEqual(report.metrics.cls.available, false);
    assert.strictEqual(report.metrics.cls.status, "unavailable");
    assert.strictEqual(report.metrics.cls.value, null);

    assert.strictEqual(report.metrics.tbt.available, false);
    assert.strictEqual(report.metrics.tbt.status, "unavailable");
    assert.strictEqual(report.metrics.tbt.value, null);

    // Real crawler metrics MUST still be collected and measured
    assert.strictEqual(report.metrics.ttfb.available, true);
    assert.strictEqual(report.metrics.ttfb.value, 150);
    assert.strictEqual(report.metrics.ttfb.status, "good");

    assert.strictEqual(report.metrics.loadComplete.available, true);
    assert.strictEqual(report.metrics.loadComplete.value, 800);

    // Verify that NO overall score property exists on report
    assert.strictEqual((report as unknown as Record<string, unknown>).score, undefined);
    assert.strictEqual((report as unknown as Record<string, unknown>).overallScore, undefined);
  });

  it("should handle Lighthouse runner timeout gracefully without throwing", async () => {
    // Custom runner with immediate timeout
    const timeoutRunner = new LighthouseRunner(1); // 1ms timeout

    const result = await timeoutRunner.runAudit("https://example.com");

    assert.strictEqual(result.isAvailable, false);
    assert.ok(result.error);
    assert.ok(result.error.toLowerCase().includes("timed out") || result.error.length > 0);
    assert.strictEqual(result.metrics.lcpMs, null);
  });
});

describe("SiteLens Performance Analyzer - Integration & Schema Validation", () => {
  it("should produce a fully normalized report conforming to the SiteLens schema", async () => {
    const crawl = createMockCrawlResult();
    const mockLh = createMockLighthouseResult();

    const analyzer = defaultDeterministicPerformanceAnalyzer;
    const report = await analyzer.analyze(crawl, {
      precomputedLighthouse: mockLh,
    });

    // Check report root
    assert.strictEqual(report.targetUrl, "https://example.com");
    assert.ok(report.analyzedAt);
    assert.ok(typeof report.durationMs === "number");

    // Check separation: raw LHR is stored under lighthouse.rawLhr
    assert.strictEqual(report.lighthouse.isAvailable, true);
    assert.strictEqual(report.lighthouse.version, "13.5.0");
    assert.ok(report.lighthouse.rawLhr, "Raw LHR must be preserved");

    // Verify all metrics have required schema fields
    for (const [key, metric] of Object.entries(report.metrics)) {
      assert.ok(metric.id, `Missing id on metric ${key}`);
      assert.ok(metric.name, `Missing name on metric ${key}`);
      assert.ok(["good", "needs-improvement", "poor", "unavailable"].includes(metric.status));
      assert.ok(typeof metric.explanation === "string");
    }

    // Verify all issues contain ID, severity, metric/evidence, explanation, recommendation
    for (const issue of report.issues) {
      assert.ok(issue.id.startsWith("perf_"), `Issue id must start with perf_: ${issue.id}`);
      assert.ok(["critical", "warning", "info"].includes(issue.severity));
      assert.ok(issue.metric, "Issue must include metric");
      assert.ok(issue.evidence !== undefined, "Issue must include evidence");
      assert.ok(issue.explanation, "Issue must include explanation");
      assert.ok(issue.recommendation, "Issue must include recommendation");
    }

    // Verify summary counts match
    const { criticalCount, warningCount, infoCount, totalIssues } = report.summary;
    assert.strictEqual(criticalCount + warningCount + infoCount, totalIssues);
  });
});
