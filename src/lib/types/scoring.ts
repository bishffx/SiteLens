/**
 * Deterministic Scoring Types and Result Specifications for SiteLens AI.
 * Completely mathematical, transparent, and reproducible.
 * Does not use AI, fake benchmarks, or vanity rankings.
 */

import type { AnalysisCategory } from "./analysis";

export type ScoreGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface CategoryWeightConfig {
  seo: number;
  performance: number;
  accessibility: number;
  content: number;
  mobile: number;
  ux: number;
}

export interface ScoreDeduction {
  reason: string;
  points: number;
  severity: "critical" | "warning" | "info" | "none";
  checkId?: string;
}

export interface CategoryScore {
  category: AnalysisCategory;
  score: number; // 0 to 100
  grade: ScoreGrade;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  unavailableChecks: number; // not_checked / unavailable without penalizing
  totalChecks: number;
  evaluableChecks: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  weight: number;
  isAvailable: boolean; // false if no evaluable checks exist
  deductions: ScoreDeduction[];
}

export interface ScoreSummary {
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  unavailableChecks: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export interface ScoreResult {
  overallScore: number; // 0 to 100
  overallGrade: ScoreGrade;
  categories: Record<AnalysisCategory, CategoryScore>;
  /**
   * Alias for categories to maintain backward compatibility across reports & AI modules.
   */
  dimensionScores: Record<AnalysisCategory, CategoryScore>;
  summary: ScoreSummary;
  weightsApplied: CategoryWeightConfig;
  scoringMethod: "deterministic_weighted_proportional";
  calculatedAt: string;
  disclaimer: string;
}

export type DeterministicScoreResult = ScoreResult;
export type DimensionScore = CategoryScore;

export interface AnalyzerReportsInput {
  seoReport?: import("../seo/types").SEOAnalysisReport | null;
  performanceReport?: import("../performance/types").PerformanceAnalysisReport | null;
  accessibilityReport?: import("../accessibility/types").AccessibilityAnalysisReport | null;
  contentReport?: import("../content/types").ContentAnalysisReport | null;
  mobileUxReport?: import("../mobile-ux/types").MobileUXAnalysisReport | null;
}

export interface ScoringWeightsConfig {
  categoryWeights: CategoryWeightConfig;
  severityDeductions: {
    critical: number;
    warning: number;
    minor: number;
  };
  gradeThresholds: {
    aPlus: number;
    a: number;
    b: number;
    c: number;
    d: number;
  };
}

export interface IScoringEngine {
  calculateScore(
    input: AnalyzerReportsInput,
    customWeights?: Partial<CategoryWeightConfig>
  ): ScoreResult;
}
