import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { DeterministicScoringEngine, SCORING_DISCLAIMER } from "../src/lib/scoring";
import type { AnalyzerReportsInput } from "../src/lib/types/scoring";
import type { SEOAnalysisReport } from "../src/lib/seo/types";
import type { PerformanceAnalysisReport } from "../src/lib/performance/types";
import type { AccessibilityAnalysisReport } from "../src/lib/accessibility/types";
import type { ContentAnalysisReport } from "../src/lib/content/types";
import type { MobileUXAnalysisReport } from "../src/lib/mobile-ux/types";

describe("SiteLens Deterministic Scoring Engine", () => {
  const engine = new DeterministicScoringEngine();

  describe("Boundary Scores & Grade Scale", () => {
    test("should correctly map boundary scores to academic letter grades", () => {
      assert.equal(engine.calculateGrade(100), "A+");
      assert.equal(engine.calculateGrade(95.0), "A+");
      assert.equal(engine.calculateGrade(94.9), "A");
      assert.equal(engine.calculateGrade(85.0), "A");
      assert.equal(engine.calculateGrade(84.9), "B");
      assert.equal(engine.calculateGrade(70.0), "B");
      assert.equal(engine.calculateGrade(69.9), "C");
      assert.equal(engine.calculateGrade(55.0), "C");
      assert.equal(engine.calculateGrade(54.9), "D");
      assert.equal(engine.calculateGrade(40.0), "D");
      assert.equal(engine.calculateGrade(39.9), "F");
      assert.equal(engine.calculateGrade(0), "F");
    });
  });

  describe("Empty Analyzer Results", () => {
    test("should handle empty or null input gracefully without throwing", () => {
      const res = engine.calculateScore({});
      assert.equal(res.overallScore, 0);
      assert.equal(res.overallGrade, "F");
      assert.equal(res.summary.totalChecks, 0);
      assert.equal(res.summary.passedChecks, 0);
      assert.equal(res.summary.failedChecks, 0);
      assert.equal(res.disclaimer, SCORING_DISCLAIMER);

      // Verify all categories exist with isAvailable: false
      for (const cat of Object.values(res.categories)) {
        assert.equal(cat.isAvailable, false);
        assert.equal(cat.score, 0);
      }
    });
  });

  describe("Perfect Results", () => {
    const perfectSEO: SEOAnalysisReport = {
      targetUrl: "https://example.com",
      finalUrl: "https://example.com",
      analyzedAt: new Date().toISOString(),
      isIndexable: true,
      summary: { totalChecks: 3, passedCount: 3, warningCount: 0, failedCount: 0, notCheckedCount: 0 },
      checks: [
        { checkId: "seo_title", category: "seo", name: "Title", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { checkId: "seo_desc", category: "seo", name: "Desc", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { checkId: "seo_h1", category: "seo", name: "H1", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
      ],
    };

    const perfectPerf: PerformanceAnalysisReport = {
      targetUrl: "https://example.com",
      analyzedAt: new Date().toISOString(),
      lighthouse: { isAvailable: true, version: "13.5.0", error: null, performanceScore: 100 },
      durationMs: 100,
      summary: { totalIssues: 0, criticalCount: 0, warningCount: 0, infoCount: 0, passedAudits: 6 },
      resources: {
        totalSizeBytes: 500000,
        htmlSizeBytes: 50000,
        totalScripts: 2,
        renderBlockingScripts: 0,
        totalStylesheets: 1,
        renderBlockingStylesheets: 0,
        totalImages: 1,
        imagesWithoutDimensions: 0,
        imagesWithoutLazyLoading: 0,
      },
      metrics: {
        lcp: { id: "lcp", name: "LCP", value: 1200, displayValue: "1.2s", unit: "ms", available: true, status: "good", thresholdGood: 2500, thresholdPoor: 4000, explanation: "Fast" },
      } as unknown as PerformanceAnalysisReport["metrics"],
      issues: [],
    };

    const perfectA11y: AccessibilityAnalysisReport = {
      targetUrl: "https://example.com",
      analyzedAt: new Date().toISOString(),
      durationMs: 50,
      engine: { name: "axe-core", version: "4.13.0", isEngineAvailable: true },
      wcagDisclaimer: "Disclaimer",
      summary: {
        totalFindings: 0,
        automaticallyDetectableCount: 0,
        requiresManualReviewCount: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        passedRulesCount: 15,
        inapplicableRulesCount: 5,
      },
      findings: [],
      passedRules: [{ id: "image-alt", description: "All images have alt" }],
    };

    const perfectContent: ContentAnalysisReport = {
      targetUrl: "https://example.com",
      analyzedAt: new Date().toISOString(),
      durationMs: 10,
      disclaimer: "Disclaimer",
      summary: { totalChecks: 2, passedCount: 2, warningCount: 0, failedCount: 0, notCheckedCount: 0 },
      metrics: {
        wordCount: 500,
        characterCount: 3000,
        sentenceCount: 25,
        paragraphCount: 5,
        headingCount: 4,
        readingTimeMinutes: 2,
        textToHtmlRatioPercent: 20,
        readability: null,
        contentBalance: { imageCount: 2, wordsPerImage: 250, wordsPerHeading: 125 },
        callToActionSummary: { detectedCtaCount: 1, ctas: [] },
      },
      checks: [
        { checkId: "content_visible_text", category: "content", name: "Text", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { checkId: "content_structure", category: "content", name: "Structure", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
      ],
    };

    const perfectMobileUX: MobileUXAnalysisReport = {
      targetUrl: "https://example.com",
      analyzedAt: new Date().toISOString(),
      durationMs: 15,
      engine: { name: "playwright-multi-viewport", version: "1.0", isLiveBrowser: true, viewportsTested: [] },
      disclaimer: "Disclaimer",
      summary: {
        totalFindings: 4,
        measuredCount: 2,
        heuristicCount: 2,
        manualReviewCount: 0,
        passedCount: 4,
        warningCount: 0,
        failedCount: 0,
        notCheckedCount: 0,
      },
      metrics: {
        viewportConfigured: true,
        viewportMetaContent: "width=device-width",
        userScalableDisabled: false,
        hasHorizontalOverflow: false,
        horizontalOverflowPx: 0,
        mobileScrollWidth: 375,
        mobileClientWidth: 375,
        tapTargetsEvaluated: 10,
        undersizedTapTargetsCount: 0,
        crowdedTapTargetsCount: 0,
        smallFontElementsCount: 0,
        minimumComputedFontSizePx: 14,
        hasMobileNavigationLandmark: true,
        hasMobileMenuToggle: true,
        imagesMissingDimensionsCount: 0,
        brokenInteractionControlsCount: 0,
        unhandledErrorsCount: 0,
      },
      findings: [
        { id: "mobile_viewport", type: "heuristic", category: "mobile", title: "Viewport", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { id: "mobile_overflow", type: "measured", category: "mobile", title: "Overflow", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { id: "ux_nav", type: "heuristic", category: "ux", title: "Nav", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
        { id: "ux_interaction", type: "measured", category: "ux", title: "Integrity", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
      ],
    };

    test("should produce 100 overall score and A+ grade for perfect analyzer results", () => {
      const input: AnalyzerReportsInput = {
        seoReport: perfectSEO,
        performanceReport: perfectPerf,
        accessibilityReport: perfectA11y,
        contentReport: perfectContent,
        mobileUxReport: perfectMobileUX,
      };

      const res = engine.calculateScore(input);

      assert.equal(res.overallScore, 100);
      assert.equal(res.overallGrade, "A+");
      assert.equal(res.categories.seo.score, 100);
      assert.equal(res.categories.performance.score, 100);
      assert.equal(res.categories.accessibility.score, 100);
      assert.equal(res.categories.content.score, 100);
      assert.equal(res.categories.mobile.score, 100);
      assert.equal(res.categories.ux.score, 100);

      assert.equal(res.summary.failedChecks, 0);
      assert.equal(res.summary.warningChecks, 0);
      assert.ok(res.summary.passedChecks > 0);
    });

    test("should be strictly reproducible when evaluated multiple times", () => {
      const input: AnalyzerReportsInput = {
        seoReport: perfectSEO,
        performanceReport: perfectPerf,
        accessibilityReport: perfectA11y,
        contentReport: perfectContent,
        mobileUxReport: perfectMobileUX,
      };

      const res1 = engine.calculateScore(input);
      const res2 = engine.calculateScore(input);

      assert.equal(res1.overallScore, res2.overallScore);
      assert.equal(res1.overallGrade, res2.overallGrade);
      assert.equal(res1.summary.totalChecks, res2.summary.totalChecks);
      assert.deepEqual(res1.weightsApplied, res2.weightsApplied);
    });
  });

  describe("Unavailable Checks Handling", () => {
    test("should NOT penalize score when checks are unavailable or not_checked", () => {
      // 2 checks pass, 3 checks are unavailable (e.g. non-English text or unmeasurable)
      const seoWithUnavailable: SEOAnalysisReport = {
        targetUrl: "https://example.com",
        finalUrl: "https://example.com",
        analyzedAt: new Date().toISOString(),
        isIndexable: true,
        summary: { totalChecks: 5, passedCount: 2, warningCount: 0, failedCount: 0, notCheckedCount: 3 },
        checks: [
          { checkId: "seo_title", category: "seo", name: "Title", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
          { checkId: "seo_desc", category: "seo", name: "Desc", status: "pass", severity: "none", explanation: "OK", evidence: null, recommendation: null },
          { checkId: "seo_og", category: "seo", name: "OG", status: "not_checked", severity: "none", explanation: "N/A", evidence: null, recommendation: null },
          { checkId: "seo_schema", category: "seo", name: "Schema", status: "not_checked", severity: "none", explanation: "N/A", evidence: null, recommendation: null },
          { checkId: "seo_links", category: "seo", name: "Links", status: "not_checked", severity: "none", explanation: "N/A", evidence: null, recommendation: null },
        ],
      };

      const res = engine.calculateScore({ seoReport: seoWithUnavailable });

      const seoCat = res.categories.seo;
      assert.equal(seoCat.passedChecks, 2);
      assert.equal(seoCat.unavailableChecks, 3);
      assert.equal(seoCat.evaluableChecks, 2);
      assert.equal(seoCat.failedChecks, 0);

      // Crucial requirement: The 3 unavailable checks MUST NOT cause score deduction.
      // Since all 2 evaluable checks passed, score must be 100!
      assert.equal(seoCat.score, 100);
      assert.equal(seoCat.grade, "A+");
    });
  });

  describe("Mixed Results & Proportional Deductions", () => {
    test("should compute proportional deductions for warnings and moderate failures", () => {
      const mixedSEO: SEOAnalysisReport = {
        targetUrl: "https://example.com",
        finalUrl: "https://example.com",
        analyzedAt: new Date().toISOString(),
        isIndexable: true,
        summary: { totalChecks: 4, passedCount: 2, warningCount: 1, failedCount: 1, notCheckedCount: 0 },
        checks: [
          { checkId: "seo_1", category: "seo", name: "C1", status: "pass", severity: "none", explanation: "Pass", evidence: null, recommendation: null },
          { checkId: "seo_2", category: "seo", name: "C2", status: "pass", severity: "none", explanation: "Pass", evidence: null, recommendation: null },
          // 4 evaluable checks = 25 pts each
          // Warning = -12.5 pts
          { checkId: "seo_3", category: "seo", name: "C3", status: "warning", severity: "warning", explanation: "Warning", evidence: null, recommendation: "Fix warning" },
          // Critical fail = -25 pts
          { checkId: "seo_4", category: "seo", name: "C4", status: "fail", severity: "critical", explanation: "Critical fail", evidence: null, recommendation: "Fix critical" },
        ],
      };

      const res = engine.calculateScore({ seoReport: mixedSEO });
      const seo = res.categories.seo;

      assert.equal(seo.passedChecks, 2);
      assert.equal(seo.warningChecks, 1);
      assert.equal(seo.failedChecks, 1);
      assert.equal(seo.evaluableChecks, 4);

      // 100 - 12.5 - 25 = 62.5
      assert.equal(seo.score, 62.5);
      assert.equal(seo.grade, "C");
      assert.equal(seo.deductions.length, 2);
    });
  });

  describe("Severe Failures & Floor Clamping", () => {
    test("should clamp category and overall scores to minimum 0 without going negative", () => {
      const severeA11y: AccessibilityAnalysisReport = {
        targetUrl: "https://example.com",
        analyzedAt: new Date().toISOString(),
        durationMs: 50,
        engine: { name: "axe-core", version: "4.13.0", isEngineAvailable: true },
        wcagDisclaimer: "Disclaimer",
        summary: {
          totalFindings: 10,
          automaticallyDetectableCount: 10,
          requiresManualReviewCount: 0,
          criticalCount: 10,
          warningCount: 0,
          infoCount: 0,
          passedRulesCount: 0,
          inapplicableRulesCount: 0,
        },
        findings: Array(10).fill(null).map((_, i) => ({
          id: `a11y_${i}`,
          engineRuleId: "color-contrast",
          type: "automatically_detectable",
          severity: "critical",
          rawImpact: "critical",
          category: "accessibility",
          title: `Severe critical violation ${i}`,
          explanation: "Failure",
          recommendation: "Fix",
          wcagTags: ["wcag2aa"],
          nodes: [],
          evidence: { affectedElementsCount: 1, sampleSelectors: [], sampleSnippets: [] },
        })),
        passedRules: [],
      };

      const res = engine.calculateScore({ accessibilityReport: severeA11y });
      const a11y = res.categories.accessibility;

      assert.equal(a11y.criticalIssues, 10);
      assert.equal(a11y.score, 0); // clamped to 0, not -50
      assert.equal(a11y.grade, "F");
    });
  });
});
