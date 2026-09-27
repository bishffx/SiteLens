/**
 * Deterministic Accessibility Analyzer for SiteLens AI.
 * Powered by axe-core (4.13.0) with deterministic static fallback.
 * Explicitly separates automatically detectable violations from manual review items.
 * Does NOT claim complete WCAG compliance or create an overall score yet.
 */

import type { SinglePageCrawlResult } from "../types/crawler";
import type {
  AccessibilityAnalysisReport,
  AccessibilitySummary,
} from "./types";
import {
  defaultAxeRunner,
  type AxeRunner,
  type AxeRunnerExecutionResult,
} from "./axe-runner";

export interface AccessibilityAnalyzerOptions {
  runner?: AxeRunner;
  precomputedResult?: AxeRunnerExecutionResult;
  skipBrowser?: boolean;
  timeoutMs?: number;
}

export const WCAG_AUTOMATED_AUDIT_DISCLAIMER =
  "Automated accessibility audits detect automatically verifiable criteria (typically 30% to 57% of WCAG guidelines). A clean automated scan does not constitute full WCAG 2.1/2.2 AA certification. Complete accessibility conformance requires human review with screen readers (NVDA, JAWS, VoiceOver), keyboard-only testing, and cognitive walkthroughs.";

export class DeterministicAccessibilityAnalyzer {
  private runner: AxeRunner;

  constructor(runner: AxeRunner = defaultAxeRunner) {
    this.runner = runner;
  }

  /**
   * Analyzes the crawled page for detectable accessibility issues.
   * Explicitly separates automatically detectable findings from items requiring manual review.
   */
  async analyze(
    crawlResult: SinglePageCrawlResult,
    options?: AccessibilityAnalyzerOptions
  ): Promise<AccessibilityAnalysisReport> {
    const startTime = Date.now();

    let axeResult: AxeRunnerExecutionResult;

    if (options?.precomputedResult) {
      axeResult = options.precomputedResult;
    } else {
      const runner = options?.runner || this.runner;
      axeResult = await runner.runAudit(crawlResult.finalUrl, crawlResult.html, {
        timeoutMs: options?.timeoutMs,
        skipBrowser: options?.skipBrowser,
      });
    }

    // Tally summary counts
    let automaticallyDetectableCount = 0;
    let requiresManualReviewCount = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const f of axeResult.findings) {
      if (f.type === "automatically_detectable") {
        automaticallyDetectableCount++;
      } else if (f.type === "requires_manual_review") {
        requiresManualReviewCount++;
      }

      if (f.severity === "critical") criticalCount++;
      else if (f.severity === "warning") warningCount++;
      else if (f.severity === "info") infoCount++;
    }

    const summary: AccessibilitySummary = {
      totalFindings: axeResult.findings.length,
      automaticallyDetectableCount,
      requiresManualReviewCount,
      criticalCount,
      warningCount,
      infoCount,
      passedRulesCount: axeResult.passedRules.length,
      inapplicableRulesCount: axeResult.inapplicableRulesCount,
    };

    const durationMs = Date.now() - startTime;

    return {
      targetUrl: crawlResult.requestedUrl,
      analyzedAt: new Date().toISOString(),
      durationMs,
      engine: {
        name: axeResult.engineName,
        version: axeResult.engineVersion,
        isEngineAvailable: axeResult.isAvailable,
      },
      wcagDisclaimer: WCAG_AUTOMATED_AUDIT_DISCLAIMER,
      summary,
      findings: axeResult.findings,
      passedRules: axeResult.passedRules,
    };
  }
}

export const defaultDeterministicAccessibilityAnalyzer =
  new DeterministicAccessibilityAnalyzer();
