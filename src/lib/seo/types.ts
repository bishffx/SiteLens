/**
 * Types and interfaces for deterministic SEO evaluation.
 */

export type SEOCheckStatus = "pass" | "warning" | "fail" | "not_checked";

export type SEOCheckSeverity = "critical" | "warning" | "info" | "none";

export interface SEOCheckResult {
  checkId: string;
  category: "seo";
  name: string;
  status: SEOCheckStatus;
  severity: SEOCheckSeverity;
  explanation: string;
  evidence: string | Record<string, unknown> | null;
  recommendation: string | null;
}

export interface SEOSummary {
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  notCheckedCount: number;
}

export interface SEOAnalysisReport {
  targetUrl: string;
  finalUrl: string;
  analyzedAt: string;
  isIndexable: boolean;
  summary: SEOSummary;
  checks: SEOCheckResult[];
}
