/**
 * Deterministic Performance Evaluation Rules for SiteLens AI.
 * Produces structured metrics and normalized issues conforming to the SiteLens schema.
 * Operates purely on real measurements: if a metric is unavailable, it is marked as such.
 */

import type { ExtractedImage, SinglePageCrawlResult } from "../types/crawler";
import type {
  PerformanceIssue,
  PerformanceMetricSignal,
  PerformanceResourceMetrics,
  PerformanceSummary,
} from "./types";
import type { LighthouseExecutionResult } from "./lighthouse-runner";

export interface PerformanceEvaluation {
  metrics: {
    performanceScore: PerformanceMetricSignal;
    fcp: PerformanceMetricSignal;
    lcp: PerformanceMetricSignal;
    cls: PerformanceMetricSignal;
    tbt: PerformanceMetricSignal;
    inp: PerformanceMetricSignal;
    speedIndex: PerformanceMetricSignal;
    ttfb: PerformanceMetricSignal;
    domContentLoaded: PerformanceMetricSignal;
    loadComplete: PerformanceMetricSignal;
  };
  resources: PerformanceResourceMetrics;
  issues: PerformanceIssue[];
  summary: PerformanceSummary;
}

export function evaluatePerformanceSignals(
  crawlResult: SinglePageCrawlResult,
  lighthouseResult: LighthouseExecutionResult
): PerformanceEvaluation {
  const issues: PerformanceIssue[] = [];
  let passedAudits = 0;

  // 1. Performance Score (from Lighthouse if available)
  const perfScore = lighthouseResult.performanceScore;
  const scoreMetric: PerformanceMetricSignal = {
    id: "perf_score",
    name: "Lighthouse Performance Score",
    value: perfScore,
    displayValue: perfScore !== null ? `${perfScore}/100` : null,
    unit: "score",
    available: perfScore !== null,
    status:
      perfScore === null
        ? "unavailable"
        : perfScore >= 90
        ? "good"
        : perfScore >= 50
        ? "needs-improvement"
        : "poor",
    thresholdGood: 90,
    thresholdPoor: 50,
    explanation:
      perfScore !== null
        ? `Lighthouse calculated an overall performance score of ${perfScore}/100.`
        : "Lighthouse performance score is unavailable in this environment.",
  };
  if (scoreMetric.status === "good") passedAudits++;

  // 2. Largest Contentful Paint (LCP)
  const lcpValue = lighthouseResult.metrics.lcpMs;
  const lcpMetric: PerformanceMetricSignal = {
    id: "perf_lcp",
    name: "Largest Contentful Paint (LCP)",
    value: lcpValue,
    displayValue: lcpValue !== null ? `${(lcpValue / 1000).toFixed(2)}s` : null,
    unit: "ms",
    available: lcpValue !== null,
    status:
      lcpValue === null
        ? "unavailable"
        : lcpValue <= 2500
        ? "good"
        : lcpValue <= 4000
        ? "needs-improvement"
        : "poor",
    thresholdGood: 2500,
    thresholdPoor: 4000,
    explanation:
      lcpValue !== null
        ? `LCP marks when the main content of a page has likely loaded (${(lcpValue / 1000).toFixed(2)}s).`
        : "LCP metric was not captured by the browser environment.",
  };

  if (lcpMetric.status === "poor") {
    issues.push({
      id: "perf_lcp_slow",
      severity: "critical",
      metric: `LCP: ${(lcpValue! / 1000).toFixed(2)}s (Target: ≤ 2.5s)`,
      evidence: { lcpMs: lcpValue, thresholdMs: 2500 },
      explanation: "Largest Contentful Paint takes longer than 4.0 seconds, degrading perceived load experience for users.",
      recommendation: "Optimize critical render path: preload hero images, eliminate render-blocking CSS/JS, and leverage server-side caching.",
    });
  } else if (lcpMetric.status === "needs-improvement") {
    issues.push({
      id: "perf_lcp_moderate",
      severity: "warning",
      metric: `LCP: ${(lcpValue! / 1000).toFixed(2)}s (Target: ≤ 2.5s)`,
      evidence: { lcpMs: lcpValue, thresholdMs: 2500 },
      explanation: "Largest Contentful Paint is between 2.5s and 4.0s, indicating opportunities for speed optimization.",
      recommendation: "Compress and modern-format LCP assets (WebP/AVIF), defer non-critical scripts, and enable HTTP/2 or HTTP/3.",
    });
  } else if (lcpMetric.status === "good") {
    passedAudits++;
  }

  // 3. First Contentful Paint (FCP)
  const fcpValue = lighthouseResult.metrics.fcpMs;
  const fcpMetric: PerformanceMetricSignal = {
    id: "perf_fcp",
    name: "First Contentful Paint (FCP)",
    value: fcpValue,
    displayValue: fcpValue !== null ? `${(fcpValue / 1000).toFixed(2)}s` : null,
    unit: "ms",
    available: fcpValue !== null,
    status:
      fcpValue === null
        ? "unavailable"
        : fcpValue <= 1800
        ? "good"
        : fcpValue <= 3000
        ? "needs-improvement"
        : "poor",
    thresholdGood: 1800,
    thresholdPoor: 3000,
    explanation:
      fcpValue !== null
        ? `FCP marks the time at which the first text or image is painted (${(fcpValue / 1000).toFixed(2)}s).`
        : "FCP metric was not captured.",
  };

  if (fcpMetric.status === "poor") {
    issues.push({
      id: "perf_fcp_slow",
      severity: "warning",
      metric: `FCP: ${(fcpValue! / 1000).toFixed(2)}s (Target: ≤ 1.8s)`,
      evidence: { fcpMs: fcpValue, thresholdMs: 1800 },
      explanation: "First Contentful Paint took longer than 3.0 seconds, leaving users with a blank screen during initial loading.",
      recommendation: "Reduce server response times, minimize critical CSS, and inline above-the-fold styling.",
    });
  } else if (fcpMetric.status === "good") {
    passedAudits++;
  }

  // 4. Cumulative Layout Shift (CLS)
  const clsValue = lighthouseResult.metrics.cls;
  const clsMetric: PerformanceMetricSignal = {
    id: "perf_cls",
    name: "Cumulative Layout Shift (CLS)",
    value: clsValue,
    displayValue: clsValue !== null ? clsValue.toFixed(3) : null,
    unit: "ratio",
    available: clsValue !== null,
    status:
      clsValue === null
        ? "unavailable"
        : clsValue <= 0.1
        ? "good"
        : clsValue <= 0.25
        ? "needs-improvement"
        : "poor",
    thresholdGood: 0.1,
    thresholdPoor: 0.25,
    explanation:
      clsValue !== null
        ? `CLS measures visual stability by tracking unexpected layout shifts during load (${clsValue.toFixed(3)}).`
        : "CLS metric was not captured.",
  };

  if (clsMetric.status === "poor") {
    issues.push({
      id: "perf_cls_high",
      severity: "critical",
      metric: `CLS: ${clsValue!.toFixed(3)} (Target: ≤ 0.100)`,
      evidence: { cls: clsValue, threshold: 0.1 },
      explanation: "High visual layout instability detected (> 0.25). Unexpected content shifts frustrate users and harm Core Web Vitals.",
      recommendation: "Set explicit width and height dimensions on all images and embeds; reserve static slot dimensions for dynamic ads and embeds.",
    });
  } else if (clsMetric.status === "needs-improvement") {
    issues.push({
      id: "perf_cls_moderate",
      severity: "warning",
      metric: `CLS: ${clsValue!.toFixed(3)} (Target: ≤ 0.100)`,
      evidence: { cls: clsValue, threshold: 0.1 },
      explanation: "Moderate layout shift observed (0.10 to 0.25).",
      recommendation: "Audit late-loading fonts (font-display: swap with fallback matching) and dynamically injected banners.",
    });
  } else if (clsMetric.status === "good") {
    passedAudits++;
  }

  // 5. Total Blocking Time (TBT)
  const tbtValue = lighthouseResult.metrics.tbtMs;
  const tbtMetric: PerformanceMetricSignal = {
    id: "perf_tbt",
    name: "Total Blocking Time (TBT)",
    value: tbtValue,
    displayValue: tbtValue !== null ? `${Math.round(tbtValue)}ms` : null,
    unit: "ms",
    available: tbtValue !== null,
    status:
      tbtValue === null
        ? "unavailable"
        : tbtValue <= 200
        ? "good"
        : tbtValue <= 600
        ? "needs-improvement"
        : "poor",
    thresholdGood: 200,
    thresholdPoor: 600,
    explanation:
      tbtValue !== null
        ? `TBT measures the total amount of time between FCP and TTI where the main thread was blocked (${Math.round(tbtValue)}ms).`
        : "TBT metric was not captured.",
  };

  if (tbtMetric.status === "poor") {
    issues.push({
      id: "perf_tbt_high",
      severity: "critical",
      metric: `TBT: ${Math.round(tbtValue!)}ms (Target: ≤ 200ms)`,
      evidence: { tbtMs: tbtValue, thresholdMs: 200 },
      explanation: "Main thread was blocked for over 600ms by heavy JavaScript tasks, causing input latency and sluggish interactions.",
      recommendation: "Break up long tasks (>50ms), code-split large JavaScript bundles, and remove unnecessary third-party scripts.",
    });
  } else if (tbtMetric.status === "needs-improvement") {
    issues.push({
      id: "perf_tbt_moderate",
      severity: "warning",
      metric: `TBT: ${Math.round(tbtValue!)}ms (Target: ≤ 200ms)`,
      evidence: { tbtMs: tbtValue, thresholdMs: 200 },
      explanation: "Main thread blocked between 200ms and 600ms.",
      recommendation: "Optimize JavaScript execution and defer non-essential client-side hydration scripts.",
    });
  } else if (tbtMetric.status === "good") {
    passedAudits++;
  }

  // 6. Interaction to Next Paint (INP)
  const inpValue = lighthouseResult.metrics.inpMs;
  const inpMetric: PerformanceMetricSignal = {
    id: "perf_inp",
    name: "Interaction to Next Paint (INP)",
    value: inpValue,
    displayValue: inpValue !== null ? `${Math.round(inpValue)}ms` : null,
    unit: "ms",
    available: inpValue !== null,
    status:
      inpValue === null
        ? "unavailable"
        : inpValue <= 200
        ? "good"
        : inpValue <= 500
        ? "needs-improvement"
        : "poor",
    thresholdGood: 200,
    thresholdPoor: 500,
    explanation:
      inpValue !== null
        ? `INP assesses page responsiveness to user interactions (${Math.round(inpValue)}ms).`
        : "INP metric was not provided by the synthetic audit runner.",
  };
  if (inpMetric.status === "good") passedAudits++;

  // 7. Speed Index
  const siValue = lighthouseResult.metrics.speedIndexMs;
  const siMetric: PerformanceMetricSignal = {
    id: "perf_speed_index",
    name: "Speed Index",
    value: siValue,
    displayValue: siValue !== null ? `${(siValue / 1000).toFixed(2)}s` : null,
    unit: "ms",
    available: siValue !== null,
    status:
      siValue === null
        ? "unavailable"
        : siValue <= 3400
        ? "good"
        : siValue <= 5800
        ? "needs-improvement"
        : "poor",
    thresholdGood: 3400,
    thresholdPoor: 5800,
    explanation:
      siValue !== null
        ? `Speed Index measures how quickly contents are visually populated (${(siValue / 1000).toFixed(2)}s).`
        : "Speed Index metric was not captured.",
  };
  if (siMetric.status === "good") passedAudits++;

  // 8. Time To First Byte (TTFB - real timing from crawler / navigation timing)
  const ttfbValue = crawlResult.timing.timeToFirstByteMs;
  const ttfbMetric: PerformanceMetricSignal = {
    id: "perf_ttfb",
    name: "Time To First Byte (TTFB)",
    value: ttfbValue,
    displayValue: ttfbValue !== null ? `${Math.round(ttfbValue)}ms` : null,
    unit: "ms",
    available: ttfbValue !== null,
    status:
      ttfbValue === null
        ? "unavailable"
        : ttfbValue <= 800
        ? "good"
        : ttfbValue <= 1800
        ? "needs-improvement"
        : "poor",
    thresholdGood: 800,
    thresholdPoor: 1800,
    explanation:
      ttfbValue !== null
        ? `TTFB measures server response latency before sending the initial HTML byte (${Math.round(ttfbValue)}ms).`
        : "TTFB was not recorded by the crawler engine.",
  };

  if (ttfbMetric.status === "poor") {
    issues.push({
      id: "perf_ttfb_slow",
      severity: "critical",
      metric: `TTFB: ${Math.round(ttfbValue!)}ms (Target: ≤ 800ms)`,
      evidence: { ttfbMs: ttfbValue, thresholdMs: 800 },
      explanation: "Server response time is critically slow (> 1.8s). Slow server processing directly delays all downstream rendering.",
      recommendation: "Investigate database queries, implement reverse proxy caching (Varnish/Cloudflare), and optimize backend CPU bottlenecks.",
    });
  } else if (ttfbMetric.status === "needs-improvement") {
    issues.push({
      id: "perf_ttfb_moderate",
      severity: "warning",
      metric: `TTFB: ${Math.round(ttfbValue!)}ms (Target: ≤ 800ms)`,
      evidence: { ttfbMs: ttfbValue, thresholdMs: 800 },
      explanation: "Server response time is moderate (800ms - 1800ms).",
      recommendation: "Enable edge caching and CDN distribution to serve content closer to end-users.",
    });
  } else if (ttfbMetric.status === "good") {
    passedAudits++;
  }

  // 9. DOM Content Loaded Time
  const dclValue = crawlResult.timing.domContentLoadedMs;
  const dclMetric: PerformanceMetricSignal = {
    id: "perf_dcl",
    name: "DOM Content Loaded",
    value: dclValue,
    displayValue: dclValue !== null ? `${Math.round(dclValue)}ms` : null,
    unit: "ms",
    available: dclValue !== null,
    status:
      dclValue === null
        ? "unavailable"
        : dclValue <= 2000
        ? "good"
        : dclValue <= 4000
        ? "needs-improvement"
        : "poor",
    thresholdGood: 2000,
    thresholdPoor: 4000,
    explanation:
      dclValue !== null
        ? `Time until initial HTML document has been completely parsed (${Math.round(dclValue)}ms).`
        : "DOM Content Loaded timing was not recorded.",
  };
  if (dclMetric.status === "good") passedAudits++;

  // 10. Load Complete Time
  const loadValue = crawlResult.timing.loadCompleteMs;
  const loadMetric: PerformanceMetricSignal = {
    id: "perf_load_complete",
    name: "Page Load Complete",
    value: loadValue,
    displayValue: `${Math.round(loadValue)}ms`,
    unit: "ms",
    available: true,
    status:
      loadValue <= 3000
        ? "good"
        : loadValue <= 6000
        ? "needs-improvement"
        : "poor",
    thresholdGood: 3000,
    thresholdPoor: 6000,
    explanation: `Total window load event completed in ${Math.round(loadValue)}ms.`,
  };
  if (loadMetric.status === "good") passedAudits++;

  // 11. Resource Analysis & Render-blocking Signals
  const scripts = crawlResult.resources.scripts || [];
  const stylesheets = crawlResult.resources.stylesheets || [];
  const images = crawlResult.images || [];

  // Render-blocking scripts: external script tags without async or defer
  const renderBlockingScripts = scripts.filter(
    (s) => s.src && !s.isAsync && !s.isDefer && !s.isModule
  ).length;

  // Render-blocking stylesheets: external stylesheets in head
  const renderBlockingStylesheets = stylesheets.filter((s) => Boolean(s.href)).length;

  if (renderBlockingScripts > 0) {
    issues.push({
      id: "perf_render_blocking_scripts",
      severity: renderBlockingScripts > 3 ? "critical" : "warning",
      metric: `${renderBlockingScripts} render-blocking script(s)`,
      evidence: {
        renderBlockingCount: renderBlockingScripts,
        totalScripts: scripts.length,
      },
      explanation: `Found ${renderBlockingScripts} external script(s) loaded synchronously without 'async' or 'defer' attributes, pausing HTML parsing.`,
      recommendation: "Add 'defer' or 'async' to non-critical external scripts, or load them dynamically after DOMContentLoaded.",
    });
  } else {
    passedAudits++;
  }

  // 12. Image Performance Signals: Dimensions & Lazy Loading
  const imagesWithoutDimensions = images.filter(
    (img) => img.width === null || img.height === null
  ).length;

  if (imagesWithoutDimensions > 0) {
    issues.push({
      id: "perf_images_missing_dimensions",
      severity: imagesWithoutDimensions > 5 ? "warning" : "info",
      metric: `${imagesWithoutDimensions} image(s) missing width/height`,
      evidence: {
        imagesWithoutDimensions,
        totalImages: images.length,
      },
      explanation: `${imagesWithoutDimensions} image(s) lack explicit width and height attributes, leading to layout shifts (CLS) when images load.`,
      recommendation: "Always declare width and height HTML attributes or CSS aspect-ratio on <img> elements.",
    });
  } else if (images.length > 0) {
    passedAudits++;
  }

  const imagesWithoutLazyLoading = images.filter(
    (img) => !img.loading || img.loading.toLowerCase() !== "lazy"
  ).length;

  if (images.length > 3 && imagesWithoutLazyLoading === images.length) {
    issues.push({
      id: "perf_images_not_lazy_loaded",
      severity: "info",
      metric: "0 lazy-loaded images",
      evidence: { totalImages: images.length, lazyLoadedCount: 0 },
      explanation: "No images on this page declare loading=\"lazy\". Below-the-fold images consume initial network bandwidth unnecessarily.",
      recommendation: "Add loading=\"lazy\" to all below-the-fold content images to speed up initial page rendering.",
    });
  }

  // 13. Resource Counts & Transfer Sizes
  const htmlSizeBytes = crawlResult.html ? Buffer.byteLength(crawlResult.html, "utf8") : null;
  const totalSizeBytes = lighthouseResult.metrics.totalByteWeight ?? htmlSizeBytes;

  if (totalSizeBytes !== null && totalSizeBytes > 5 * 1024 * 1024) {
    issues.push({
      id: "perf_excessive_page_weight",
      severity: "warning",
      metric: `Total Page Weight: ${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      evidence: { totalSizeBytes, thresholdBytes: 5 * 1024 * 1024 },
      explanation: "Total page weight exceeds 5 MB. Heavy payloads drain mobile bandwidth and significantly increase load times.",
      recommendation: "Compress image assets, minify CSS/JS bundles, and leverage gzip/brotli transfer compression.",
    });
  } else if (totalSizeBytes !== null) {
    passedAudits++;
  }

  if (scripts.length > 30) {
    issues.push({
      id: "perf_excessive_scripts",
      severity: "warning",
      metric: `${scripts.length} script tags`,
      evidence: { totalScripts: scripts.length, threshold: 30 },
      explanation: `Page includes ${scripts.length} separate script tags, resulting in excessive HTTP request overhead and parsing cost.`,
      recommendation: "Bundle modular scripts together and evaluate third-party tag managers for duplicate or obsolete libraries.",
    });
  }

  if (stylesheets.length > 20) {
    issues.push({
      id: "perf_excessive_stylesheets",
      severity: "warning",
      metric: `${stylesheets.length} stylesheets`,
      evidence: { totalStylesheets: stylesheets.length, threshold: 20 },
      explanation: `Page links ${stylesheets.length} external stylesheets, increasing critical render-blocking requests.`,
      recommendation: "Consolidate and minify CSS stylesheets into a unified production stylesheet.",
    });
  }

  const resourceMetrics: PerformanceResourceMetrics = {
    totalSizeBytes,
    htmlSizeBytes,
    totalScripts: scripts.length,
    renderBlockingScripts,
    totalStylesheets: stylesheets.length,
    renderBlockingStylesheets,
    totalImages: images.length,
    imagesWithoutDimensions,
    imagesWithoutLazyLoading,
  };

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const issue of issues) {
    if (issue.severity === "critical") criticalCount++;
    else if (issue.severity === "warning") warningCount++;
    else if (issue.severity === "info") infoCount++;
  }

  const summary: PerformanceSummary = {
    totalIssues: issues.length,
    criticalCount,
    warningCount,
    infoCount,
    passedAudits,
  };

  return {
    metrics: {
      performanceScore: scoreMetric,
      fcp: fcpMetric,
      lcp: lcpMetric,
      cls: clsMetric,
      tbt: tbtMetric,
      inp: inpMetric,
      speedIndex: siMetric,
      ttfb: ttfbMetric,
      domContentLoaded: dclMetric,
      loadComplete: loadMetric,
    },
    resources: resourceMetrics,
    issues,
    summary,
  };
}
