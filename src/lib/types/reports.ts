/**
 * Audit Report, History, and Comparison Types.
 */

import type { CentralAnalysisResult } from "./analysis";
import type { DeterministicScoreResult, ScoreGrade } from "./scoring";
import type { AIInterpretationResult } from "./ai";

export interface SiteLensAuditReport {
  id: string;
  targetUrl: string;
  normalizedUrl: string;
  createdAt: string;
  durationMs: number;
  scores: DeterministicScoreResult;
  analysis: CentralAnalysisResult;
  aiInterpretation?: AIInterpretationResult;
  meta: {
    appVersion: string;
    userAgent: string;
    environment: string;
  };
  crawlerResult?: import("./crawler").SinglePageCrawlResult;
  seoReport?: import("../seo/types").SEOAnalysisReport;
  performanceReport?: import("../performance/types").PerformanceAnalysisReport;
  accessibilityReport?: import("../accessibility/types").AccessibilityAnalysisReport;
  contentReport?: import("../content/types").ContentAnalysisReport;
  mobileUxReport?: import("../mobile-ux/types").MobileUXAnalysisReport;
}

export interface AuditHistorySummary {
  id: string;
  targetUrl: string;
  createdAt: string;
  overallScore: number;
  overallGrade: ScoreGrade;
  issuesCount: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface DimensionComparison {
  category: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number; // positive = improvement, negative = regression
  resolvedIssuesCount: number;
  newIssuesCount: number;
}

export interface AuditComparisonResult {
  comparisonId: string;
  url: string;
  baselineAuditId: string;
  currentAuditId: string;
  baselineDate: string;
  currentDate: string;
  overallScoreBefore: number;
  overallScoreAfter: number;
  overallScoreDelta: number;
  gradeBefore: ScoreGrade;
  gradeAfter: ScoreGrade;
  dimensions: DimensionComparison[];
  resolvedIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
  }>;
  newIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
  }>;
  persistingIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
  }>;
}

export interface IReportStorage {
  saveReport(report: SiteLensAuditReport): Promise<void>;
  getReportById(id: string): Promise<SiteLensAuditReport | null>;
  listHistory(url?: string, limit?: number): Promise<AuditHistorySummary[]>;
}
