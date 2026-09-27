/**
 * Mobile and UX Analyzer Orchestrator for SiteLens AI.
 * Analyzes real browser measurements and crawler data across representative viewports.
 * Clearly separates measured issues, heuristic issues, and manual-review recommendations.
 */

import type { SinglePageCrawlResult } from "../types/crawler";
import type {
  MobileUXAnalysisReport,
  MobileUXFinding,
  MobileUXMetrics,
  MobileUXSummary,
} from "./types";
import { MobileUXPlaywrightRunner, type PlaywrightRunnerOptions } from "./playwright-runner";
import { checkViewportMeta } from "./rules/viewport-rules";
import { checkHorizontalOverflow } from "./rules/overflow-rules";
import { checkResponsiveLayoutBehavior } from "./rules/responsive-rules";
import { checkTapTargets } from "./rules/tap-target-rules";
import { checkMobileLegibility } from "./rules/legibility-rules";
import { checkMobileNavigation } from "./rules/navigation-rules";
import { checkInteractionIntegrity } from "./rules/interaction-rules";
import { checkLoadingUsability } from "./rules/loading-usability-rules";
import { checkLayoutStability } from "./rules/layout-stability-rules";
import { generateManualReviewFindings } from "./rules/manual-review-rules";

export const MOBILE_UX_DISCLAIMER =
  "Mobile and UX analysis combines real multi-viewport browser measurements with structural heuristics. Usability on physical hardware, gesture ergonomics, and context-dependent conversion flows require human manual review.";

export class DeterministicMobileUXAnalyzer {
  private runner: MobileUXPlaywrightRunner;

  constructor() {
    this.runner = new MobileUXPlaywrightRunner();
  }

  /**
   * Analyzes page across representative mobile (375x667) and tablet (768x1024) viewports.
   */
  async analyze(
    crawlResult: SinglePageCrawlResult,
    options?: PlaywrightRunnerOptions
  ): Promise<MobileUXAnalysisReport> {
    const startTime = Date.now();
    const targetUrl = crawlResult.finalUrl || crawlResult.requestedUrl;
    const html = crawlResult.html || "";

    // Run in-browser or static multi-viewport evaluation
    const executionResult = await this.runner.run(targetUrl, html, options);
    const { mobileData, tabletHasOverflow, unhandledErrors } = executionResult;

    const findings: MobileUXFinding[] = [];

    // 1. Viewport Configuration (Heuristic)
    findings.push(checkViewportMeta(crawlResult.viewport));

    // 2. Horizontal Overflow at Mobile Viewport (Measured)
    findings.push(checkHorizontalOverflow(mobileData));

    // 3. Responsive Layout Multi-Viewport Adaptation (Measured)
    findings.push(
      checkResponsiveLayoutBehavior(mobileData.hasHorizontalOverflow, tabletHasOverflow)
    );

    // 4. Tap Target Sizing and Proximity (Measured)
    findings.push(checkTapTargets(mobileData.tapTargets));

    // 5. Mobile Font Legibility (Measured)
    findings.push(checkMobileLegibility(mobileData.typography));

    // 6. Mobile Navigation Accessibility (Heuristic)
    findings.push(checkMobileNavigation(mobileData.navigation));

    // 7. Interaction Controls Integrity (Measured)
    findings.push(checkInteractionIntegrity(mobileData.interactionIntegrity, unhandledErrors));

    // 8. Page Loading Usability (Measured)
    findings.push(checkLoadingUsability(crawlResult.timing));

    // 9. Visual Layout Stability / Dimensions (Measured)
    findings.push(checkLayoutStability(mobileData.layoutStability));

    // 10. Manual Review Usability Recommendations (Manual Review)
    findings.push(...generateManualReviewFindings());

    // Compute Summary Tallies
    let measuredCount = 0;
    let heuristicCount = 0;
    let manualReviewCount = 0;
    let passedCount = 0;
    let warningCount = 0;
    let failedCount = 0;
    let notCheckedCount = 0;

    for (const f of findings) {
      if (f.type === "measured") measuredCount++;
      else if (f.type === "heuristic") heuristicCount++;
      else if (f.type === "manual_review") manualReviewCount++;

      if (f.status === "pass") passedCount++;
      else if (f.status === "warning") warningCount++;
      else if (f.status === "fail") failedCount++;
      else if (f.status === "not_checked") notCheckedCount++;
    }

    const summary: MobileUXSummary = {
      totalFindings: findings.length,
      measuredCount,
      heuristicCount,
      manualReviewCount,
      passedCount,
      warningCount,
      failedCount,
      notCheckedCount,
    };

    const metrics: MobileUXMetrics = {
      viewportConfigured: Boolean(crawlResult.viewport?.metaViewport),
      viewportMetaContent: crawlResult.viewport?.metaViewport || null,
      userScalableDisabled: Boolean(crawlResult.viewport?.userScalableDisabled),
      hasHorizontalOverflow: mobileData.hasHorizontalOverflow,
      horizontalOverflowPx: mobileData.horizontalOverflowPx,
      mobileScrollWidth: mobileData.scrollWidth,
      mobileClientWidth: mobileData.viewportWidth,
      tapTargetsEvaluated: mobileData.tapTargets.totalEvaluated,
      undersizedTapTargetsCount: mobileData.tapTargets.sampleUndersized.length,
      crowdedTapTargetsCount: mobileData.tapTargets.crowdedCount,
      smallFontElementsCount: mobileData.typography.smallFontElementsCount,
      minimumComputedFontSizePx: mobileData.typography.minimumFontSizePx,
      hasMobileNavigationLandmark: mobileData.navigation.hasNavLandmark,
      hasMobileMenuToggle: mobileData.navigation.hasMobileToggle,
      imagesMissingDimensionsCount: mobileData.layoutStability.imagesWithoutDimensionsCount,
      brokenInteractionControlsCount:
        mobileData.interactionIntegrity.brokenHrefsCount +
        mobileData.interactionIntegrity.formsMissingSubmitCount,
      unhandledErrorsCount: unhandledErrors.length,
    };

    const durationMs = Date.now() - startTime;

    return {
      targetUrl,
      analyzedAt: new Date().toISOString(),
      durationMs,
      engine: {
        name: executionResult.engineName,
        version: executionResult.engineVersion,
        isLiveBrowser: executionResult.isLiveBrowser,
        viewportsTested: executionResult.viewportsTested,
      },
      disclaimer: MOBILE_UX_DISCLAIMER,
      summary,
      metrics,
      findings,
    };
  }
}

export const defaultDeterministicMobileUXAnalyzer = new DeterministicMobileUXAnalyzer();
