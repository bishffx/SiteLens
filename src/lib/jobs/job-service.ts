import { generateAuditId } from "../utils/id-generator";
import { validateAndNormalizeUrl } from "../validation/url";
import { AuditLogger } from "../utils/logger";
import { defaultJobStore } from "./job-store";
import { defaultCrawlerManager } from "../crawler/crawler-manager";
import type {
  AnalysisJob,
  AnalysisJobError,
  AnalysisJobErrorCode,
  CreateJobRequest,
  CrawlTargetMetadata,
} from "../types/job";
import type { SinglePageCrawlResult } from "../types/crawler";

const logger = new AuditLogger("JobService");

export class JobService {
  /**
   * Validates input and creates an analysis job in queued status.
   */
  async createJob(request: CreateJobRequest): Promise<AnalysisJob> {
    const rawUrl = request.url;

    // Step 1: Validate and Normalize URL
    const valResult = validateAndNormalizeUrl(rawUrl);
    if (!valResult.isValid || !valResult.normalizedUrl) {
      const error: AnalysisJobError = {
        code: (valResult.errorCode as AnalysisJobErrorCode) || "INVALID_URL",
        userMessage: valResult.errorMessage || "Invalid website URL provided.",
        timestamp: new Date().toISOString(),
      };

      const failedJob: AnalysisJob = {
        jobId: generateAuditId(),
        targetUrl: rawUrl || "",
        normalizedUrl: "",
        status: "failed",
        currentStageMessage: "URL validation failed.",
        createdAt: new Date().toISOString(),
        options: {
          deviceType: request.deviceType || "desktop",
          enabledCategories: request.enabledCategories || [
            "seo",
            "performance",
            "accessibility",
            "content",
            "mobile",
            "ux",
          ],
          requestAI: request.requestAI || false,
        },
        error,
      };

      defaultJobStore.create(failedJob);
      logger.warn(`Job rejected at validation: ${error.userMessage}`, { rawUrl });
      return failedJob;
    }

    const normalizedUrl = valResult.normalizedUrl;
    const jobId = generateAuditId();

    const job: AnalysisJob = {
      jobId,
      targetUrl: rawUrl,
      normalizedUrl,
      status: "queued",
      currentStageMessage: "Audit job initialized and queued for execution.",
      createdAt: new Date().toISOString(),
      options: {
        deviceType: request.deviceType || "desktop",
        enabledCategories: request.enabledCategories || [
          "seo",
          "performance",
          "accessibility",
          "content",
          "mobile",
          "ux",
        ],
        requestAI: request.requestAI || false,
        timeoutMs: 25000,
      },
    };

    defaultJobStore.create(job);
    logger.info(`Job created: ${jobId}`, { normalizedUrl });

    // Step 2: Trigger server-side crawler execution
    this.processJob(jobId).catch((err) => {
      logger.error(`Unhandled error processing job ${jobId}`, err);
    });

    return job;
  }

  /**
   * Retrieves an analysis job by its ID.
   */
  getJob(jobId: string): AnalysisJob | null {
    return defaultJobStore.get(jobId);
  }

  /**
   * Runs local AI interpretation on an existing, completed job.
   */
  async runAIInterpretation(jobId: string): Promise<AnalysisJob | null> {
    const job = defaultJobStore.get(jobId);
    if (!job || job.status !== "completed" || !job.scoreResult) {
      return null;
    }

    const { defaultAIService } = await import("../ai/ai-service");

    const topIssues: import("../types/analysis").AnalysisIssue[] = [];

    if (job.seoReport) {
      for (const chk of job.seoReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
        topIssues.push({
          id: chk.checkId,
          category: "seo",
          severity: chk.severity === "critical" ? "critical" : "warning",
          title: chk.name,
          description: chk.explanation,
          recommendation: chk.recommendation || "",
          impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
        });
      }
    }

    if (job.performanceReport) {
      for (const iss of job.performanceReport.issues) {
        topIssues.push({
          id: iss.id,
          category: "performance",
          severity: iss.severity,
          title: iss.metric,
          description: iss.explanation,
          recommendation: iss.recommendation,
          impactScoreDeduction: iss.severity === "critical" ? 15 : 6,
        });
      }
    }

    if (job.accessibilityReport) {
      for (const f of job.accessibilityReport.findings.filter((f) => f.type === "automatically_detectable")) {
        topIssues.push({
          id: f.id,
          category: "accessibility",
          severity: f.severity,
          title: f.title,
          description: f.explanation,
          recommendation: f.recommendation,
          impactScoreDeduction: f.severity === "critical" ? 15 : 6,
        });
      }
    }

    if (job.contentReport) {
      for (const chk of job.contentReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
        topIssues.push({
          id: chk.checkId,
          category: "content",
          severity: chk.severity === "critical" ? "critical" : "warning",
          title: chk.name,
          description: chk.explanation,
          recommendation: chk.recommendation || "",
          impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
        });
      }
    }

    if (job.mobileUxReport) {
      for (const f of job.mobileUxReport.findings.filter((f) => f.status === "fail" || f.status === "warning")) {
        topIssues.push({
          id: f.id,
          category: f.category,
          severity: f.severity === "critical" ? "critical" : "warning",
          title: f.title,
          description: f.explanation,
          recommendation: f.recommendation || "",
          impactScoreDeduction: f.severity === "critical" ? 15 : 6,
        });
      }
    }

    let aiReport: import("../types/ai").AIInterpretationReport;
    try {
      aiReport = await defaultAIService.interpretAudit({
        url: job.normalizedUrl || job.targetUrl,
        scores: job.scoreResult,
        topIssues,
      });
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      aiReport = {
        isAvailable: false,
        status: "failed",
        provider: defaultAIService.providerName,
        model: "llama3:8b",
        unavailableReason: `Local AI interpretation encountered an unexpected error: ${msg}`,
        generatedAt: new Date().toISOString(),
        executionDurationMs: 0,
      };
    }

    const updatedJob = defaultJobStore.update(jobId, {
      aiReport,
    });

    try {
      const { defaultReportStorage } = await import("../reports/report-storage");
      const existingReport = await defaultReportStorage.getReportById(job.reportId || jobId);
      if (existingReport) {
        existingReport.aiInterpretation = aiReport;
        await defaultReportStorage.saveReport(existingReport);
      }
    } catch {
      // non-fatal
    }

    return updatedJob;
  }

  /**
   * Internal worker executing the real server-side crawler pipeline.
   */
  private async processJob(jobId: string): Promise<void> {
    const job = defaultJobStore.get(jobId);
    if (!job) return;

    const timeoutMs = job.options.timeoutMs || 25000;
    const targetUrl = job.normalizedUrl;

    try {
      // Transition: validating host
      defaultJobStore.update(jobId, {
        status: "validating",
        startedAt: new Date().toISOString(),
        currentStageMessage: "Validating host reachability and resolving DNS...",
      });

      // Transition: crawling
      defaultJobStore.update(jobId, {
        status: "crawling",
        currentStageMessage: "Navigating headless browser and extracting document hierarchy...",
      });

      // Execute single-page crawl via Playwright (with HTTP fallback)
      let crawlResult: SinglePageCrawlResult;
      try {
        crawlResult = await defaultCrawlerManager.crawlSinglePage(targetUrl, {
          deviceType: job.options.deviceType,
          timeoutMs,
        });
      } catch (crawlErr: unknown) {
        this.handleCrawlerError(jobId, crawlErr, targetUrl);
        return;
      }

      // Check HTTP error status
      const status = crawlResult.httpStatus;
      if (status !== null && (status < 200 || status >= 400)) {
        let userMessage = `The target website returned HTTP ${status} (${crawlResult.statusText || "Error"}).`;
        if (status === 404) {
          userMessage = "Target page returned HTTP 404 (Not Found). Verify that the path exists.";
        } else if (status === 401 || status === 403) {
          userMessage = `Target page returned HTTP ${status} (Access Denied). The website is protected or blocking automated requests.`;
        } else if (status >= 500) {
          userMessage = `Target server error HTTP ${status}. The remote server is experiencing technical issues.`;
        }

        defaultJobStore.update(jobId, {
          status: "failed",
          completedAt: new Date().toISOString(),
          currentStageMessage: `Crawl failed with HTTP ${status}`,
          error: {
            code: "HTTP_ERROR",
            userMessage,
            technicalDetails: `HTTP ${status} ${crawlResult.statusText || ""}`,
            timestamp: new Date().toISOString(),
          },
        });
        logger.warn(`Job ${jobId} failed with HTTP ${status}`, { targetUrl });
        return;
      }

      const contentLengthBytes = Buffer.byteLength(crawlResult.html || "", "utf8");

      const metadata: CrawlTargetMetadata = {
        finalUrl: crawlResult.finalUrl,
        statusCode: crawlResult.httpStatus || 200,
        statusText: crawlResult.statusText || "OK",
        contentType: crawlResult.headers["content-type"] || "text/html",
        contentLengthBytes,
        responseTimeMs: crawlResult.timing.loadCompleteMs,
        pageTitle: crawlResult.pageTitle || undefined,
        isHttps: crawlResult.finalUrl.startsWith("https://"),
        serverHeader: crawlResult.headers["server"] || undefined,
      };

      // Transition: analyzing (deterministic SEO, Performance, Accessibility, Content, and Mobile/UX inspections)
      defaultJobStore.update(jobId, {
        status: "analyzing",
        currentStageMessage: "Executing deterministic SEO, Performance, Accessibility, Content, and Mobile/UX inspections on real measurements...",
      });

      const { defaultDeterministicSEOAnalyzer } = await import("../seo/seo-analyzer");
      const { defaultDeterministicPerformanceAnalyzer } = await import("../performance/performance-analyzer");
      const { defaultDeterministicAccessibilityAnalyzer } = await import("../accessibility/accessibility-analyzer");
      const { defaultDeterministicContentAnalyzer } = await import("../content/content-analyzer");
      const { defaultDeterministicMobileUXAnalyzer } = await import("../mobile-ux/mobile-ux-analyzer");
      const { defaultDeterministicScoringEngine } = await import("../scoring/deterministic-scorer");

      const seoReport = defaultDeterministicSEOAnalyzer.analyze(crawlResult);
      const contentReport = defaultDeterministicContentAnalyzer.analyze(crawlResult);
      const [performanceReport, accessibilityReport, mobileUxReport] = await Promise.all([
        defaultDeterministicPerformanceAnalyzer.analyze(crawlResult, { timeoutMs: 25000 }),
        defaultDeterministicAccessibilityAnalyzer.analyze(crawlResult, { timeoutMs: 20000 }),
        defaultDeterministicMobileUXAnalyzer.analyze(crawlResult, { timeoutMs: 20000 }),
      ]);

      // Calculate transparent deterministic score
      const scoreResult = defaultDeterministicScoringEngine.calculateScore({
        seoReport,
        performanceReport,
        accessibilityReport,
        contentReport,
        mobileUxReport,
      });

      // Execute Local AI Interpretation (Ollama)
      let aiReport: import("../types/ai").AIInterpretationReport | undefined = undefined;
      if (job.options.requestAI) {
        defaultJobStore.update(jobId, {
          status: "analyzing",
          currentStageMessage: "Requesting local AI interpretation from Ollama...",
        });

        const { defaultAIService } = await import("../ai/ai-service");

        // Collect top issues across dimensions for AI grounding
        const topIssues: import("../types/analysis").AnalysisIssue[] = [];

        for (const chk of seoReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
          topIssues.push({
            id: chk.checkId,
            category: "seo",
            severity: chk.severity === "critical" ? "critical" : "warning",
            title: chk.name,
            description: chk.explanation,
            recommendation: chk.recommendation || "",
            impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
          });
        }

        for (const iss of performanceReport.issues) {
          topIssues.push({
            id: iss.id,
            category: "performance",
            severity: iss.severity,
            title: iss.metric,
            description: iss.explanation,
            recommendation: iss.recommendation,
            impactScoreDeduction: iss.severity === "critical" ? 15 : 6,
          });
        }

        for (const f of accessibilityReport.findings.filter((f) => f.type === "automatically_detectable")) {
          topIssues.push({
            id: f.id,
            category: "accessibility",
            severity: f.severity,
            title: f.title,
            description: f.explanation,
            recommendation: f.recommendation,
            impactScoreDeduction: f.severity === "critical" ? 15 : 6,
          });
        }

        for (const chk of contentReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
          topIssues.push({
            id: chk.checkId,
            category: "content",
            severity: chk.severity === "critical" ? "critical" : "warning",
            title: chk.name,
            description: chk.explanation,
            recommendation: chk.recommendation || "",
            impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
          });
        }

        for (const f of mobileUxReport.findings.filter((f) => f.status === "fail" || f.status === "warning")) {
          topIssues.push({
            id: f.id,
            category: f.category,
            severity: f.severity === "critical" ? "critical" : "warning",
            title: f.title,
            description: f.explanation,
            recommendation: f.recommendation || "",
            impactScoreDeduction: f.severity === "critical" ? 15 : 6,
          });
        }

        try {
          aiReport = await defaultAIService.interpretAudit({
            url: targetUrl,
            scores: scoreResult,
            topIssues,
          });
        } catch (aiErr: unknown) {
          const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          aiReport = {
            isAvailable: false,
            status: "failed",
            provider: defaultAIService.providerName,
            model: "llama3:8b",
            unavailableReason: `Local AI interpretation encountered an unexpected error: ${msg}`,
            generatedAt: new Date().toISOString(),
            executionDurationMs: 0,
          };
        }
      }

      const { buildAuditReport } = await import("../reports/report-builder");
      const { defaultReportStorage } = await import("../reports/report-storage");

      const allIssues: import("../types/analysis").AnalysisIssue[] = [];

      for (const chk of seoReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
        allIssues.push({
          id: chk.checkId,
          category: "seo",
          severity: chk.severity === "critical" ? "critical" : "warning",
          title: chk.name,
          description: chk.explanation,
          recommendation: chk.recommendation || "",
          impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
        });
      }

      for (const iss of performanceReport.issues) {
        allIssues.push({
          id: iss.id,
          category: "performance",
          severity: iss.severity,
          title: iss.metric,
          description: iss.explanation,
          recommendation: iss.recommendation,
          impactScoreDeduction: iss.severity === "critical" ? 15 : 6,
        });
      }

      for (const f of accessibilityReport.findings.filter((f) => f.type === "automatically_detectable")) {
        allIssues.push({
          id: f.id,
          category: "accessibility",
          severity: f.severity,
          title: f.title,
          description: f.explanation,
          recommendation: f.recommendation,
          impactScoreDeduction: f.severity === "critical" ? 15 : 6,
        });
      }

      for (const chk of contentReport.checks.filter((c) => c.status === "fail" || c.status === "warning")) {
        allIssues.push({
          id: chk.checkId,
          category: "content",
          severity: chk.severity === "critical" ? "critical" : "warning",
          title: chk.name,
          description: chk.explanation,
          recommendation: chk.recommendation || "",
          impactScoreDeduction: chk.severity === "critical" ? 15 : 6,
        });
      }

      for (const f of mobileUxReport.findings.filter((f) => f.status === "fail" || f.status === "warning")) {
        allIssues.push({
          id: f.id,
          category: f.category,
          severity: f.severity === "critical" ? "critical" : "warning",
          title: f.title,
          description: f.explanation,
          recommendation: f.recommendation || "",
          impactScoreDeduction: f.severity === "critical" ? 15 : 6,
        });
      }

      const centralAnalysis: import("../types/analysis").CentralAnalysisResult = {
        analyzedUrl: crawlResult.finalUrl,
        timestamp: new Date().toISOString(),
        allIssues,
        executionTimeMs: crawlResult.timing.loadCompleteMs,
      };

      const auditReport = buildAuditReport({
        id: jobId,
        targetUrl: crawlResult.finalUrl,
        durationMs: crawlResult.timing.loadCompleteMs,
        scores: scoreResult,
        analysis: centralAnalysis,
        aiInterpretation: aiReport,
        crawlerResult: crawlResult,
        seoReport,
        performanceReport,
        accessibilityReport,
        contentReport,
        mobileUxReport,
      });

      try {
        await defaultReportStorage.saveReport(auditReport);
      } catch (saveErr) {
        logger.warn(`Failed to persist report ${jobId} to file storage`, saveErr);
      }

      // Store crawl outcome, SEO, Performance, Accessibility, Content, Mobile/UX reports, Score, AI, and reportId
      defaultJobStore.update(jobId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        currentStageMessage:
          `Audits completed: Overall score ${scoreResult.overallScore}/100 (${scoreResult.overallGrade}) across 6 dimensions with ${scoreResult.summary.totalIssues} issues evaluated.`,
        targetMetadata: metadata,
        crawlerResult: crawlResult,
        seoReport,
        performanceReport,
        accessibilityReport,
        contentReport,
        mobileUxReport,
        scoreResult,
        aiReport,
        reportId: auditReport.id,
      });

      logger.info(`Job ${jobId} successfully crawled ${crawlResult.finalUrl}`, {
        status: crawlResult.httpStatus,
        linksCount: crawlResult.links.length,
        imagesCount: crawlResult.images.length,
        headingsCount: crawlResult.headings.all.length,
        loadTimeMs: crawlResult.timing.loadCompleteMs,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      defaultJobStore.update(jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        currentStageMessage: "Pipeline execution encountered a server error.",
        error: {
          code: "SERVER_ERROR",
          userMessage:
            "An unexpected error occurred while executing the crawler. Please try again.",
          technicalDetails: msg,
          timestamp: new Date().toISOString(),
        },
      });
      logger.error(`Job ${jobId} unexpected failure`, err);
    }
  }

  /**
   * Translates crawler/browser-level errors into safe, informative user messages.
   */
  private handleCrawlerError(jobId: string, error: unknown, targetUrl: string) {
    let code: AnalysisJobErrorCode = "CRAWLER_ERROR";
    let userMessage =
      "Unable to complete website crawl. Please ensure the website is online and allows connections.";

    const err = error as { name?: string; message?: string };
    const errMsg = (err.message || "").toLowerCase();

    if (errMsg.includes("timeout") || err.name === "TimeoutError") {
      code = "REQUEST_TIMEOUT";
      userMessage =
        "The connection to the website timed out. The server took longer than 25 seconds to respond.";
    } else if (
      errMsg.includes("net::err_name_not_resolved") ||
      errMsg.includes("enotfound") ||
      errMsg.includes("eai_again")
    ) {
      code = "UNREACHABLE_HOST";
      userMessage =
        "Could not resolve the domain name. Please check for spelling mistakes and verify the domain has active DNS records.";
    } else if (
      errMsg.includes("net::err_connection_refused") ||
      errMsg.includes("econnrefused")
    ) {
      code = "CONNECTION_REFUSED";
      userMessage =
        "Connection was refused by the target server. The website service may be offline or unreachable on standard ports.";
    } else if (
      errMsg.includes("net::err_cert") ||
      errMsg.includes("ssl") ||
      errMsg.includes("certificate")
    ) {
      code = "SSL_ERROR";
      userMessage =
        "An SSL/TLS certificate error occurred when connecting to the website. The certificate may be expired, self-signed, or untrusted.";
    }

    defaultJobStore.update(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      currentStageMessage: "Crawler failed to access website.",
      error: {
        code,
        userMessage,
        technicalDetails: err.message?.slice(0, 300) || "Unknown crawler error",
        timestamp: new Date().toISOString(),
      },
    });

    logger.warn(`Crawler error for job ${jobId} [${code}]: ${err.message}`, {
      targetUrl,
    });
  }
}

export const defaultJobService = new JobService();
