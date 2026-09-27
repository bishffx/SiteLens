/**
 * Deterministic Performance Analyzer for SiteLens AI.
 * Uses real measurements only: integrates Lighthouse where the environment supports it,
 * while collecting crawler-based timing and resource signals.
 * Does NOT invent metrics or create a final overall score yet.
 */

import type { SinglePageCrawlResult } from "../types/crawler";
import type { PerformanceAnalysisReport } from "./types";
import {
  defaultLighthouseRunner,
  type LighthouseExecutionResult,
  type LighthouseRunner,
} from "./lighthouse-runner";
import { evaluatePerformanceSignals } from "./performance-rules";

export interface PerformanceAnalyzerOptions {
  lighthouseRunner?: LighthouseRunner;
  precomputedLighthouse?: LighthouseExecutionResult;
  skipLighthouse?: boolean;
  timeoutMs?: number;
}

export class DeterministicPerformanceAnalyzer {
  private runner: LighthouseRunner;

  constructor(runner: LighthouseRunner = defaultLighthouseRunner) {
    this.runner = runner;
  }

  /**
   * Analyzes page performance using real measurements from Lighthouse and crawler DOM/timing.
   * If Lighthouse cannot run or times out, Lighthouse-specific metrics are explicitly
   * marked as unavailable while all real crawler metrics are processed.
   */
  async analyze(
    crawlResult: SinglePageCrawlResult,
    options?: PerformanceAnalyzerOptions
  ): Promise<PerformanceAnalysisReport> {
    const startTime = Date.now();

    let lhResult: LighthouseExecutionResult;

    if (options?.precomputedLighthouse) {
      lhResult = options.precomputedLighthouse;
    } else if (options?.skipLighthouse) {
      lhResult = {
        isAvailable: false,
        version: null,
        error: "Lighthouse execution was skipped by options.",
        performanceScore: null,
        rawLhr: null,
        metrics: {
          fcpMs: null,
          lcpMs: null,
          cls: null,
          tbtMs: null,
          inpMs: null,
          speedIndexMs: null,
          totalByteWeight: null,
        },
        details: {
          renderBlockingResourcesCount: null,
          unsizedImagesCount: null,
          domElementCount: null,
        },
      };
    } else {
      const runner = options?.lighthouseRunner || this.runner;
      lhResult = await runner.runAudit(crawlResult.finalUrl, {
        timeoutMs: options?.timeoutMs,
      });
    }

    // Evaluate deterministic signals from both real crawler output and Lighthouse measurements
    const evaluation = evaluatePerformanceSignals(crawlResult, lhResult);

    const durationMs = Date.now() - startTime;

    return {
      targetUrl: crawlResult.requestedUrl,
      analyzedAt: new Date().toISOString(),
      durationMs,
      lighthouse: {
        isAvailable: lhResult.isAvailable,
        version: lhResult.version,
        error: lhResult.error,
        performanceScore: lhResult.performanceScore,
        rawLhr: lhResult.rawLhr,
      },
      metrics: evaluation.metrics,
      resources: evaluation.resources,
      issues: evaluation.issues,
      summary: evaluation.summary,
    };
  }
}

export const defaultDeterministicPerformanceAnalyzer = new DeterministicPerformanceAnalyzer();
