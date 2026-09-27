/**
 * Server-side Analysis Job and Status Types.
 */

export type AnalysisJobStatus =
  | "idle"
  | "validating"
  | "queued"
  | "crawling"
  | "analyzing"
  | "generating_report"
  | "completed"
  | "failed";

export type AnalysisJobErrorCode =
  | "MISSING_URL"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "UNREACHABLE_HOST"
  | "CONNECTION_REFUSED"
  | "REQUEST_TIMEOUT"
  | "SSL_ERROR"
  | "HTTP_ERROR"
  | "SERVER_ERROR"
  | "CRAWLER_ERROR";

export interface AnalysisJobError {
  code: AnalysisJobErrorCode;
  userMessage: string;
  technicalDetails?: string;
  timestamp: string;
}

export interface CrawlTargetMetadata {
  finalUrl: string;
  statusCode: number;
  statusText: string;
  contentType: string;
  contentLengthBytes: number;
  responseTimeMs: number;
  pageTitle?: string;
  isHttps: boolean;
  serverHeader?: string;
}

export interface AnalysisJobOptions {
  deviceType: "desktop" | "mobile";
  enabledCategories: string[];
  requestAI: boolean;
  timeoutMs?: number;
}

export interface AnalysisJob {
  jobId: string;
  targetUrl: string;
  normalizedUrl: string;
  status: AnalysisJobStatus;
  currentStageMessage: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  options: AnalysisJobOptions;
  targetMetadata?: CrawlTargetMetadata;
  crawlerResult?: import("./crawler").SinglePageCrawlResult;
  seoReport?: import("../seo/types").SEOAnalysisReport;
  performanceReport?: import("../performance/types").PerformanceAnalysisReport;
  accessibilityReport?: import("../accessibility/types").AccessibilityAnalysisReport;
  contentReport?: import("../content/types").ContentAnalysisReport;
  mobileUxReport?: import("../mobile-ux/types").MobileUXAnalysisReport;
  scoreResult?: import("./scoring").ScoreResult;
  aiReport?: import("./ai").AIInterpretationReport;
  error?: AnalysisJobError;
  reportId?: string;
}

export interface CreateJobRequest {
  url: string;
  deviceType?: "desktop" | "mobile";
  enabledCategories?: string[];
  requestAI?: boolean;
}

export interface JobStatusResponse {
  success: boolean;
  job: AnalysisJob;
}
