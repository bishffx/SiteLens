/**
 * Central Analysis Result Schema and Dimension Types.
 * Every analyzer produces predictable, structured data conforming to these contracts.
 */

import type { CrawledPageData } from "./crawler";

export type IssueSeverity = "critical" | "warning" | "info";

export type AnalysisCategory =
  | "seo"
  | "performance"
  | "accessibility"
  | "content"
  | "mobile"
  | "ux";

export type AnalysisStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "failed";

export interface AnalysisIssue {
  id: string;
  category: AnalysisCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  explanation?: string;
  evidence?: string | Record<string, unknown> | null;
  recommendation: string;
  targetElement?: string;
  codeSnippet?: string;
  impactScoreDeduction: number;
  documentationUrl?: string;
}

export interface MetricMeasurement {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "ratio" | "score";
  thresholdGood: number;
  thresholdPoor: number;
  actualStatus: "good" | "needs-improvement" | "poor";
}

export interface BaseDimensionResult {
  category: AnalysisCategory;
  status: AnalysisStatus;
  executionTimeMs: number;
  issues: AnalysisIssue[];
  metrics: Record<string, MetricMeasurement>;
  passedChecks: number;
  totalChecks: number;
  error?: string;
  // Generic list of checks performed by the analyzer (pass/fail/warn)
  checks?: Array<{
    checkId: string;
    name: string;
    status: 'pass' | 'fail' | 'warn';
    explanation?: string;
    // Additional fields used by UI
    title?: string;
    description?: string;
  }>;
}

export interface SEOAnalysisResult extends BaseDimensionResult {
  category: "seo";
  metaData: {
    hasTitle: boolean;
    titleLength: number;
    hasMetaDescription: boolean;
    metaDescriptionLength: number;
    hasCanonical: boolean;
    canonicalUrl?: string;
    hasRobotsTag: boolean;
    robotsDirectives?: string[];
    hasOpenGraphTags: boolean;
    hasTwitterCards: boolean;
    hasStructuredData: boolean;
    h1Count: number;
    headingHierarchyValid: boolean;
  };
}

export interface PerformanceAnalysisResult extends BaseDimensionResult {
  category: "performance";
  networkMetrics: {
    totalTransferSizeBytes: number;
    resourceCounts: {
      scripts: number;
      stylesheets: number;
      images: number;
      fonts: number;
      other: number;
    };
    timeToFirstByteMs: number;
    domContentLoadedMs: number;
    loadCompleteMs: number;
  };
}

export interface AccessibilityAnalysisResult extends BaseDimensionResult {
  category: "accessibility";
  auditSummary: {
    imagesMissingAlt: number;
    emptyLinks: number;
    contrastIssuesCount: number;
    missingFormLabels: number;
    ariaAttributeErrors: number;
    htmlLangAttributePresent: boolean;
  };
}

export interface ContentAnalysisResult extends BaseDimensionResult {
  category: "content";
  contentMetrics: {
    wordCount: number;
    readingTimeMinutes: number;
    readabilityScore?: number;
    textToHtmlRatio: number;
    duplicateContentDetected: boolean;
  };
}

export interface MobileAnalysisResult extends BaseDimensionResult {
  category: "mobile";
  mobileMetrics: {
    viewportConfigured: boolean;
    viewportMetaContent?: string;
    tapTargetsSufficientlySized: boolean;
    contentFitsWithinScreen: boolean;
    fontLegibilityPassed: boolean;
  };
}

export interface UXAnalysisResult extends BaseDimensionResult {
  category: "ux";
  uxMetrics: {
    brokenLinksCount: number;
    hasFavicon: boolean;
    hasCustom404Detected: boolean;
    visualClutterRatio?: number;
    hasClearCallToAction: boolean;
  };
}

export interface CentralAnalysisResult {
  analyzedUrl: string;
  timestamp: string;
  seo?: SEOAnalysisResult;
  performance?: PerformanceAnalysisResult;
  accessibility?: AccessibilityAnalysisResult;
  content?: ContentAnalysisResult;
  mobile?: MobileAnalysisResult;
  ux?: UXAnalysisResult;
  allIssues: AnalysisIssue[];
  executionTimeMs: number;
}

export interface IAnalyzer<TResult extends BaseDimensionResult> {
  readonly category: AnalysisCategory;
  analyze(page: CrawledPageData): Promise<TResult>;
}
