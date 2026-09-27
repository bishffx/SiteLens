/**
 * Mobile and UX Analysis Types and Contracts for SiteLens AI.
 * Explicitly separates:
 * 1. Measured issues (real browser measurements)
 * 2. Heuristic issues (DOM and architectural patterns)
 * 3. Manual-review recommendations (context-dependent usability advice)
 */

export type MobileUXFindingType = "measured" | "heuristic" | "manual_review";
export type MobileUXSeverity = "critical" | "warning" | "info" | "none";
export type MobileUXStatus = "pass" | "warning" | "fail" | "not_checked";
export type MobileUXCategory = "mobile" | "ux";

export interface MobileUXEvidenceNode {
  selector?: string;
  html?: string;
  measurements?: Record<string, unknown>;
  details?: string;
}

export interface MobileUXFinding {
  id: string;
  type: MobileUXFindingType; // "measured" | "heuristic" | "manual_review"
  category: MobileUXCategory; // "mobile" | "ux"
  title: string;
  status: MobileUXStatus;
  severity: MobileUXSeverity;
  explanation: string;
  evidence: {
    viewportTested?: "mobile_375" | "tablet_768" | "desktop_1280" | "all";
    sampleNodes?: MobileUXEvidenceNode[];
    [key: string]: unknown;
  } | null;
  recommendation: string | null;
}

export interface RepresentativeViewport {
  name: "mobile" | "tablet" | "desktop";
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
}

export interface MobileUXMetrics {
  viewportConfigured: boolean;
  viewportMetaContent: string | null;
  userScalableDisabled: boolean;
  hasHorizontalOverflow: boolean;
  horizontalOverflowPx: number;
  mobileScrollWidth: number | null;
  mobileClientWidth: number | null;
  tapTargetsEvaluated: number;
  undersizedTapTargetsCount: number;
  crowdedTapTargetsCount: number;
  smallFontElementsCount: number;
  minimumComputedFontSizePx: number | null;
  hasMobileNavigationLandmark: boolean;
  hasMobileMenuToggle: boolean;
  imagesMissingDimensionsCount: number;
  brokenInteractionControlsCount: number;
  unhandledErrorsCount: number;
}

export interface MobileUXSummary {
  totalFindings: number;
  measuredCount: number;
  heuristicCount: number;
  manualReviewCount: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  notCheckedCount: number;
}

export interface MobileUXAnalysisReport {
  targetUrl: string;
  analyzedAt: string;
  durationMs: number;
  engine: {
    name: "playwright-multi-viewport" | "sitelens-static-dom";
    version: string;
    isLiveBrowser: boolean;
    viewportsTested: Array<{ name: string; width: number; height: number }>;
  };
  disclaimer: string;
  summary: MobileUXSummary;
  metrics: MobileUXMetrics;
  findings: MobileUXFinding[];
}
