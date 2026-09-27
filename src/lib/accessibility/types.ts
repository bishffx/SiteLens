/**
 * Accessibility Analyzer Types and Contracts for SiteLens AI.
 * Distinguishes 'automatically detectable' issues from those that 'require manual review'.
 * Conforms to the normalized SiteLens analyzer schema with concrete evidence.
 */

export type AccessibilityFindingType = "automatically_detectable" | "requires_manual_review";
export type AccessibilitySeverity = "critical" | "warning" | "info";

export interface AccessibilityEvidenceNode {
  target: string[];
  html: string;
  failureSummary?: string;
}

export interface AccessibilityFinding {
  id: string; // SiteLens finding ID (e.g. "a11y_image_alt", "a11y_color_contrast")
  engineRuleId: string; // Underlying axe-core rule ID (e.g. "image-alt", "color-contrast")
  type: AccessibilityFindingType; // "automatically_detectable" | "requires_manual_review"
  severity: AccessibilitySeverity;
  rawImpact: "critical" | "serious" | "moderate" | "minor" | null;
  category: "accessibility";
  title: string;
  explanation: string;
  recommendation: string;
  wcagTags: string[];
  helpUrl?: string;
  nodes: AccessibilityEvidenceNode[];
  evidence: {
    affectedElementsCount: number;
    sampleSelectors: string[];
    sampleSnippets: string[];
    failureDetails?: string;
  };
}

export interface AccessibilityPassedRule {
  id: string;
  description: string;
  helpUrl?: string;
}

export interface AccessibilitySummary {
  totalFindings: number;
  automaticallyDetectableCount: number;
  requiresManualReviewCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedRulesCount: number;
  inapplicableRulesCount: number;
}

export interface AccessibilityAnalysisReport {
  targetUrl: string;
  analyzedAt: string;
  durationMs: number;
  engine: {
    name: "axe-core" | "sitelens-dom-audit";
    version: string;
    isEngineAvailable: boolean;
  };
  /**
   * Explicit disclaimer: automated accessibility tools do not prove complete WCAG compliance.
   */
  wcagDisclaimer: string;
  summary: AccessibilitySummary;
  findings: AccessibilityFinding[];
  passedRules: AccessibilityPassedRule[];
}
