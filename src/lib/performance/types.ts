/**
 * Performance Analyzer Types and Contracts for SiteLens AI.
 * Strict separation between normalized SiteLens results and raw Lighthouse data.
 */

export type PerformanceMetricStatus = "good" | "needs-improvement" | "poor" | "unavailable";
export type PerformanceIssueSeverity = "critical" | "warning" | "info";

export interface PerformanceMetricSignal {
  id: string;
  name: string;
  value: number | null;
  displayValue: string | null;
  unit: "ms" | "score" | "bytes" | "ratio" | "count";
  available: boolean;
  status: PerformanceMetricStatus;
  thresholdGood?: number;
  thresholdPoor?: number;
  explanation: string;
}

export interface PerformanceIssue {
  id: string;
  severity: PerformanceIssueSeverity;
  metric: string;
  evidence: unknown;
  explanation: string;
  recommendation: string;
}

export interface PerformanceResourceMetrics {
  totalSizeBytes: number | null;
  htmlSizeBytes: number | null;
  totalScripts: number;
  renderBlockingScripts: number;
  totalStylesheets: number;
  renderBlockingStylesheets: number;
  totalImages: number;
  imagesWithoutDimensions: number;
  imagesWithoutLazyLoading: number;
}

export interface LighthouseAuditData {
  isAvailable: boolean;
  version: string | null;
  error: string | null;
  performanceScore: number | null; // 0 to 100 where available
  rawLhr?: Record<string, unknown> | null;
}

export interface PerformanceSummary {
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedAudits: number;
}

export interface PerformanceAnalysisReport {
  targetUrl: string;
  analyzedAt: string;
  durationMs: number;
  lighthouse: LighthouseAuditData;
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
