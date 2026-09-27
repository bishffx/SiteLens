/**
 * Content Analyzer Types and Contracts for SiteLens AI.
 * Deterministic analysis of extracted page text, structure, readability, and content signals.
 * Does not assume business intent or invoke AI.
 */

export type ContentCheckStatus = "pass" | "warning" | "fail" | "not_checked";
export type ContentCheckSeverity = "critical" | "warning" | "info" | "none";

export interface ContentEvidenceData {
  [key: string]: unknown;
}

export interface ContentCheckResult {
  checkId: string;
  category: "content";
  name: string;
  status: ContentCheckStatus;
  severity: ContentCheckSeverity;
  explanation: string;
  evidence: ContentEvidenceData | null;
  recommendation: string | null;
}

export interface ReadabilityMetrics {
  fleschReadingEase: number | null;
  fleschKincaidGradeLevel: number | null;
  readingEaseLabel: string | null;
  totalWords: number;
  totalSentences: number;
  totalSyllables: number;
  averageWordsPerSentence: number | null;
  averageSyllablesPerWord: number | null;
}

export interface DetectedCta {
  text: string;
  tag: "a" | "button" | "input" | "role_button";
  href?: string;
  patternMatched: string;
}

export interface ContentMetrics {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  readingTimeMinutes: number;
  textToHtmlRatioPercent: number;
  readability: ReadabilityMetrics | null;
  contentBalance: {
    imageCount: number;
    wordsPerImage: number | null;
    wordsPerHeading: number | null;
  };
  callToActionSummary: {
    detectedCtaCount: number;
    ctas: DetectedCta[];
  };
}

export interface ContentSummary {
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  notCheckedCount: number;
}

export interface ContentAnalysisReport {
  targetUrl: string;
  analyzedAt: string;
  durationMs: number;
  disclaimer: string;
  summary: ContentSummary;
  metrics: ContentMetrics;
  checks: ContentCheckResult[];
}
