/**
 * Deterministic Scoring Engine for SiteLens AI.
 * Computes transparent, mathematically reproducible category and overall scores.
 * Accounts for unavailable checks without treating missing evidence as failed.
 * Does not use AI, fake benchmarks, or vanity rankings.
 */

import type {
  AnalyzerReportsInput,
  CategoryScore,
  CategoryWeightConfig,
  IScoringEngine,
  ScoreDeduction,
  ScoreGrade,
  ScoreResult,
  ScoreSummary,
} from "../types/scoring";
import type { AnalysisCategory } from "../types/analysis";
import type { SEOAnalysisReport } from "../seo/types";
import type { PerformanceAnalysisReport } from "../performance/types";
import type { AccessibilityAnalysisReport } from "../accessibility/types";
import type { ContentAnalysisReport } from "../content/types";
import type { MobileUXAnalysisReport } from "../mobile-ux/types";
import { DEFAULT_CATEGORY_WEIGHTS, DEFAULT_GRADE_THRESHOLDS } from "./weights";
import { clamp, round } from "../utils/math";

export const SCORING_DISCLAIMER =
  "SiteLens scores are computed deterministically using weighted mathematical rules applied directly to real DOM and network measurements. Missing or inapplicable checks are excluded from the score denominator rather than penalized as failures.";

export class DeterministicScoringEngine implements IScoringEngine {
  /**
   * Assigns an academic letter grade based on configurable numeric thresholds.
   */
  public calculateGrade(score: number): ScoreGrade {
    const { aPlus, a, b, c, d } = DEFAULT_GRADE_THRESHOLDS;
    if (score >= aPlus) return "A+";
    if (score >= a) return "A";
    if (score >= b) return "B";
    if (score >= c) return "C";
    if (score >= d) return "D";
    return "F";
  }

  /**
   * Primary entry point: computes transparent category scores and overall score.
   */
  public calculateScore(
    input: AnalyzerReportsInput,
    customWeights?: Partial<CategoryWeightConfig>
  ): ScoreResult {
    const weights: CategoryWeightConfig = {
      ...DEFAULT_CATEGORY_WEIGHTS,
      ...(customWeights || {}),
    };

    // Calculate individual category scores
    const seo = this.scoreSEO(input.seoReport, weights.seo);
    const performance = this.scorePerformance(input.performanceReport, weights.performance);
    const accessibility = this.scoreAccessibility(input.accessibilityReport, weights.accessibility);
    const content = this.scoreContent(input.contentReport, weights.content);
    const mobile = this.scoreMobile(input.mobileUxReport, weights.mobile);
    const ux = this.scoreUX(input.mobileUxReport, weights.ux);

    const categories: Record<AnalysisCategory, CategoryScore> = {
      seo,
      performance,
      accessibility,
      content,
      mobile,
      ux,
    };

    // Compute Overall Score with Dynamic Weight Redistribution
    // If a category has no evaluable checks, its weight is reallocated proportionally
    let activeWeightSum = 0;
    let weightedScoreSum = 0;

    const categoryList: CategoryScore[] = Object.values(categories);

    for (const cat of categoryList) {
      if (cat.isAvailable && cat.weight > 0) {
        activeWeightSum += cat.weight;
        weightedScoreSum += cat.score * cat.weight;
      }
    }

    const overallScore =
      activeWeightSum > 0 ? clamp(round(weightedScoreSum / activeWeightSum, 1), 0, 100) : 0;

    const overallGrade = this.calculateGrade(overallScore);

    // Aggregate Global Summary Counts
    const summary: ScoreSummary = {
      totalChecks: categoryList.reduce((acc, c) => acc + c.totalChecks, 0),
      passedChecks: categoryList.reduce((acc, c) => acc + c.passedChecks, 0),
      warningChecks: categoryList.reduce((acc, c) => acc + c.warningChecks, 0),
      failedChecks: categoryList.reduce((acc, c) => acc + c.failedChecks, 0),
      unavailableChecks: categoryList.reduce((acc, c) => acc + c.unavailableChecks, 0),
      totalIssues: categoryList.reduce((acc, c) => acc + c.totalIssues, 0),
      criticalIssues: categoryList.reduce((acc, c) => acc + c.criticalIssues, 0),
      warningIssues: categoryList.reduce((acc, c) => acc + c.warningIssues, 0),
      infoIssues: categoryList.reduce((acc, c) => acc + c.infoIssues, 0),
    };

    return {
      overallScore,
      overallGrade,
      categories,
      dimensionScores: categories,
      summary,
      weightsApplied: weights,
      scoringMethod: "deterministic_weighted_proportional",
      calculatedAt: new Date().toISOString(),
      disclaimer: SCORING_DISCLAIMER,
    };
  }

  /**
   * 1. SEO Category Scoring:
   * Proportional check evaluation across 17 deterministic checks.
   * Unavailable checks ('not_checked') are excluded from the evaluable denominator.
   */
  private scoreSEO(report: SEOAnalysisReport | null | undefined, weight: number): CategoryScore {
    if (!report || !report.checks || report.checks.length === 0) {
      return this.createEmptyCategoryScore("seo", weight);
    }

    const deductions: ScoreDeduction[] = [];
    let passedChecks = 0;
    let warningChecks = 0;
    let failedChecks = 0;
    let unavailableChecks = 0;

    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;

    for (const chk of report.checks) {
      if (chk.status === "pass") {
        passedChecks++;
      } else if (chk.status === "warning") {
        warningChecks++;
        warningIssues++;
      } else if (chk.status === "fail") {
        failedChecks++;
        if (chk.severity === "critical") criticalIssues++;
        else warningIssues++;
      } else if (chk.status === "not_checked") {
        unavailableChecks++;
      }
    }

    const evaluableChecks = passedChecks + warningChecks + failedChecks;
    if (evaluableChecks === 0) {
      return this.createUnavailableCategoryScore("seo", weight, unavailableChecks);
    }

    // Each evaluable check accounts for (100 / evaluableChecks) points
    const pointsPerCheck = 100 / evaluableChecks;
    let score = 100;

    for (const chk of report.checks) {
      if (chk.status === "warning") {
        const points = round(pointsPerCheck * 0.5, 1);
        deductions.push({
          reason: chk.explanation || chk.name,
          points,
          severity: "warning",
          checkId: chk.checkId,
        });
        score -= points;
      } else if (chk.status === "fail") {
        const factor = chk.severity === "critical" ? 1.0 : 0.75;
        const points = round(pointsPerCheck * factor, 1);
        deductions.push({
          reason: chk.explanation || chk.name,
          points,
          severity: chk.severity,
          checkId: chk.checkId,
        });
        score -= points;
      }
    }

    const finalScore = clamp(round(score, 1), 0, 100);

    return {
      category: "seo",
      score: finalScore,
      grade: this.calculateGrade(finalScore),
      passedChecks,
      warningChecks,
      failedChecks,
      unavailableChecks,
      totalChecks: report.checks.length,
      evaluableChecks,
      totalIssues: criticalIssues + warningIssues + infoIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      weight,
      isAvailable: true,
      deductions,
    };
  }

  /**
   * 2. Performance Category Scoring:
   * Combines real Lighthouse score (when available) with deterministic network/asset checks.
   * When Lighthouse is unavailable, relies 100% on real crawler measurements without penalizing.
   */
  private scorePerformance(
    report: PerformanceAnalysisReport | null | undefined,
    weight: number
  ): CategoryScore {
    if (!report) {
      return this.createEmptyCategoryScore("performance", weight);
    }

    const deductions: ScoreDeduction[] = [];
    const passedChecks = report.summary?.passedAudits || 0;
    let warningChecks = 0;
    let failedChecks = 0;
    const unavailableChecks = report.metrics
      ? Object.values(report.metrics).filter((m) => !m.available).length
      : 0;

    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;

    for (const issue of report.issues || []) {
      if (issue.severity === "critical") {
        criticalIssues++;
        failedChecks++;
      } else if (issue.severity === "warning") {
        warningIssues++;
        warningChecks++;
      } else {
        infoIssues++;
      }
    }

    const totalIssues = criticalIssues + warningIssues + infoIssues;
    const evaluableChecks = passedChecks + warningChecks + failedChecks;

    // Check if Lighthouse provided a direct lab score (0-100)
    const hasLighthouse = report.lighthouse?.isAvailable && report.lighthouse.performanceScore !== null;
    const lighthouseScore = hasLighthouse ? (report.lighthouse.performanceScore as number) : null;

    let finalScore: number;

    if (hasLighthouse && lighthouseScore !== null) {
      // 50% Lighthouse lab score, 50% deterministic issues score
      const deterministicDeductions = criticalIssues * 15 + warningIssues * 6;
      for (const issue of report.issues || []) {
        deductions.push({
          reason: issue.metric || issue.explanation,
          points: issue.severity === "critical" ? 15 : 6,
          severity: issue.severity,
          checkId: issue.id,
        });
      }
      const deterministicScore = clamp(100 - deterministicDeductions, 0, 100);
      finalScore = clamp(round(lighthouseScore * 0.5 + deterministicScore * 0.5, 1), 0, 100);
    } else {
      // Lighthouse unavailable: derive 100% deterministically from real measurements
      let rawScore = 100;
      for (const issue of report.issues || []) {
        const points = issue.severity === "critical" ? 16 : 7;
        deductions.push({
          reason: issue.metric || issue.explanation,
          points,
          severity: issue.severity,
          checkId: issue.id,
        });
        rawScore -= points;
      }
      finalScore = clamp(round(rawScore, 1), 0, 100);
    }

    return {
      category: "performance",
      score: finalScore,
      grade: this.calculateGrade(finalScore),
      passedChecks,
      warningChecks,
      failedChecks,
      unavailableChecks,
      totalChecks: evaluableChecks + unavailableChecks,
      evaluableChecks,
      totalIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      weight,
      isAvailable: true,
      deductions,
    };
  }

  /**
   * 3. Accessibility Category Scoring:
   * Evaluates automatically detectable violations using axe-core rules.
   * Manual review recommendations do NOT trigger automated score deductions.
   */
  private scoreAccessibility(
    report: AccessibilityAnalysisReport | null | undefined,
    weight: number
  ): CategoryScore {
    if (!report) {
      return this.createEmptyCategoryScore("accessibility", weight);
    }

    const deductions: ScoreDeduction[] = [];
    const passedChecks = report.summary?.passedRulesCount || 0;
    const unavailableChecks = report.summary?.inapplicableRulesCount || 0;

    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    let score = 100;

    for (const finding of report.findings || []) {
      if (finding.type === "automatically_detectable") {
        if (finding.severity === "critical") {
          criticalIssues++;
          failedChecks++;
          const points = 15;
          deductions.push({
            reason: finding.title,
            points,
            severity: "critical",
            checkId: finding.id,
          });
          score -= points;
        } else if (finding.severity === "warning") {
          warningIssues++;
          warningChecks++;
          const points = 7;
          deductions.push({
            reason: finding.title,
            points,
            severity: "warning",
            checkId: finding.id,
          });
          score -= points;
        } else {
          infoIssues++;
        }
      } else {
        // "requires_manual_review": Informational only, does NOT penalize automated score
        infoIssues++;
      }
    }

    const finalScore = clamp(round(score, 1), 0, 100);
    const evaluableChecks = passedChecks + failedChecks + warningChecks;

    return {
      category: "accessibility",
      score: finalScore,
      grade: this.calculateGrade(finalScore),
      passedChecks,
      warningChecks,
      failedChecks,
      unavailableChecks,
      totalChecks: evaluableChecks + unavailableChecks,
      evaluableChecks,
      totalIssues: criticalIssues + warningIssues + infoIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      weight,
      isAvailable: true,
      deductions,
    };
  }

  /**
   * 4. Content Category Scoring:
   * Evaluates text availability, readability, semantic structure, and keyword density.
   * Inapplicable checks (e.g. non-English text for Flesch formulas) are safely ignored.
   */
  private scoreContent(
    report: ContentAnalysisReport | null | undefined,
    weight: number
  ): CategoryScore {
    if (!report || !report.checks || report.checks.length === 0) {
      return this.createEmptyCategoryScore("content", weight);
    }

    const deductions: ScoreDeduction[] = [];
    let passedChecks = 0;
    let warningChecks = 0;
    let failedChecks = 0;
    let unavailableChecks = 0;

    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;

    for (const chk of report.checks) {
      if (chk.status === "pass") {
        passedChecks++;
      } else if (chk.status === "warning") {
        warningChecks++;
        warningIssues++;
      } else if (chk.status === "fail") {
        failedChecks++;
        if (chk.severity === "critical") criticalIssues++;
        else warningIssues++;
      } else if (chk.status === "not_checked") {
        unavailableChecks++;
      }
    }

    const evaluableChecks = passedChecks + warningChecks + failedChecks;
    if (evaluableChecks === 0) {
      return this.createUnavailableCategoryScore("content", weight, unavailableChecks);
    }

    const pointsPerCheck = 100 / evaluableChecks;
    let score = 100;

    for (const chk of report.checks) {
      if (chk.status === "warning") {
        const points = round(pointsPerCheck * 0.5, 1);
        deductions.push({
          reason: chk.explanation || chk.name,
          points,
          severity: "warning",
          checkId: chk.checkId,
        });
        score -= points;
      } else if (chk.status === "fail") {
        const factor = chk.severity === "critical" ? 1.0 : 0.75;
        const points = round(pointsPerCheck * factor, 1);
        deductions.push({
          reason: chk.explanation || chk.name,
          points,
          severity: chk.severity,
          checkId: chk.checkId,
        });
        score -= points;
      }
    }

    const finalScore = clamp(round(score, 1), 0, 100);

    return {
      category: "content",
      score: finalScore,
      grade: this.calculateGrade(finalScore),
      passedChecks,
      warningChecks,
      failedChecks,
      unavailableChecks,
      totalChecks: report.checks.length,
      evaluableChecks,
      totalIssues: criticalIssues + warningIssues + infoIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      weight,
      isAvailable: true,
      deductions,
    };
  }

  /**
   * 5. Mobile Category Scoring:
   * Isolates mobile findings (viewport, horizontal overflow, tap targets, font legibility).
   * Manual review recommendations do NOT trigger automated score deductions.
   */
  private scoreMobile(
    report: MobileUXAnalysisReport | null | undefined,
    weight: number
  ): CategoryScore {
    if (!report || !report.findings) {
      return this.createEmptyCategoryScore("mobile", weight);
    }

    const mobileFindings = report.findings.filter((f) => f.category === "mobile");
    return this.scoreFindingsSubset(mobileFindings, "mobile", weight);
  }

  /**
   * 6. UX Category Scoring:
   * Isolates UX findings (navigation landmark, interactions, layout stability, loading usability).
   * Manual review recommendations do NOT trigger automated score deductions.
   */
  private scoreUX(
    report: MobileUXAnalysisReport | null | undefined,
    weight: number
  ): CategoryScore {
    if (!report || !report.findings) {
      return this.createEmptyCategoryScore("ux", weight);
    }

    const uxFindings = report.findings.filter((f) => f.category === "ux");
    return this.scoreFindingsSubset(uxFindings, "ux", weight);
  }

  /**
   * Helper: Scores a subset of findings (Mobile or UX) with proportional weights.
   */
  private scoreFindingsSubset(
    findings: Array<import("../mobile-ux/types").MobileUXFinding>,
    category: AnalysisCategory,
    weight: number
  ): CategoryScore {
    if (findings.length === 0) {
      return this.createEmptyCategoryScore(category, weight);
    }

    const deductions: ScoreDeduction[] = [];
    let passedChecks = 0;
    let warningChecks = 0;
    let failedChecks = 0;
    let unavailableChecks = 0;

    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;

    for (const f of findings) {
      if (f.type === "manual_review") {
        // Manual review items are informational and not part of the automated deduction
        unavailableChecks++;
        infoIssues++;
      } else if (f.status === "pass") {
        passedChecks++;
      } else if (f.status === "warning") {
        warningChecks++;
        warningIssues++;
      } else if (f.status === "fail") {
        failedChecks++;
        if (f.severity === "critical") criticalIssues++;
        else warningIssues++;
      } else if (f.status === "not_checked") {
        unavailableChecks++;
      }
    }

    const evaluableChecks = passedChecks + warningChecks + failedChecks;
    if (evaluableChecks === 0) {
      return this.createUnavailableCategoryScore(category, weight, unavailableChecks);
    }

    const pointsPerCheck = 100 / evaluableChecks;
    let score = 100;

    for (const f of findings) {
      if (f.type !== "manual_review") {
        if (f.status === "warning") {
          const points = round(pointsPerCheck * 0.5, 1);
          deductions.push({
            reason: f.explanation || f.title,
            points,
            severity: "warning",
            checkId: f.id,
          });
          score -= points;
        } else if (f.status === "fail") {
          const factor = f.severity === "critical" ? 1.0 : 0.75;
          const points = round(pointsPerCheck * factor, 1);
          deductions.push({
            reason: f.explanation || f.title,
            points,
            severity: f.severity,
            checkId: f.id,
          });
          score -= points;
        }
      }
    }

    const finalScore = clamp(round(score, 1), 0, 100);

    return {
      category,
      score: finalScore,
      grade: this.calculateGrade(finalScore),
      passedChecks,
      warningChecks,
      failedChecks,
      unavailableChecks,
      totalChecks: findings.length,
      evaluableChecks,
      totalIssues: criticalIssues + warningIssues + infoIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      weight,
      isAvailable: true,
      deductions,
    };
  }

  /**
   * Helper: Creates an empty/zero result when an analyzer was never executed.
   */
  private createEmptyCategoryScore(category: AnalysisCategory, weight: number): CategoryScore {
    return {
      category,
      score: 0,
      grade: "F",
      passedChecks: 0,
      warningChecks: 0,
      failedChecks: 0,
      unavailableChecks: 0,
      totalChecks: 0,
      evaluableChecks: 0,
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      weight,
      isAvailable: false,
      deductions: [],
    };
  }

  /**
   * Helper: Creates a neutral result when all checks in a category were unavailable.
   */
  private createUnavailableCategoryScore(
    category: AnalysisCategory,
    weight: number,
    unavailableChecks: number
  ): CategoryScore {
    return {
      category,
      score: 100, // Neutral 100 since zero failures occurred
      grade: "A+",
      passedChecks: 0,
      warningChecks: 0,
      failedChecks: 0,
      unavailableChecks,
      totalChecks: unavailableChecks,
      evaluableChecks: 0,
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      weight,
      isAvailable: false, // Excluded from overall weight calculations
      deductions: [],
    };
  }
}

export const defaultDeterministicScoringEngine = new DeterministicScoringEngine();
