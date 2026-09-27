/**
 * Centralized, Configurable Scoring Weights and Grade Thresholds for SiteLens AI.
 * Deterministic configuration — transparent and reproducible.
 */

import type { CategoryWeightConfig, ScoringWeightsConfig } from "../types/scoring";

export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeightConfig = {
  seo: 0.20,
  performance: 0.25,
  accessibility: 0.20,
  content: 0.15,
  mobile: 0.10,
  ux: 0.10,
};

export const DEFAULT_SEVERITY_DEDUCTIONS = {
  critical: 15,
  warning: 6,
  minor: 2,
};

export const DEFAULT_GRADE_THRESHOLDS = {
  aPlus: 95,
  a: 85,
  b: 70,
  c: 55,
  d: 40,
};

export const DEFAULT_SCORING_CONFIG: ScoringWeightsConfig = {
  categoryWeights: DEFAULT_CATEGORY_WEIGHTS,
  severityDeductions: DEFAULT_SEVERITY_DEDUCTIONS,
  gradeThresholds: DEFAULT_GRADE_THRESHOLDS,
};
