import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { defaultJobService, defaultJobStore } from "../src/lib/jobs";
import { defaultReportStorage } from "../src/lib/reports";
import { buildAuditReport } from "../src/lib/reports/report-builder";
import type { ScoreResult } from "../src/lib/types/scoring";
import type { CentralAnalysisResult } from "../src/lib/types/analysis";

function makeMockCategoryScore(
  category: import("../src/lib/types/analysis").AnalysisCategory,
  score: number,
  grade: import("../src/lib/types/scoring").ScoreGrade
) {
  return {
    category,
    score,
    grade,
    passedChecks: 8,
    warningChecks: 2,
    failedChecks: 1,
    unavailableChecks: 0,
    totalChecks: 11,
    evaluableChecks: 11,
    totalIssues: 3,
    criticalIssues: 1,
    warningIssues: 2,
    infoIssues: 0,
    weight: 0.166,
    isAvailable: true,
    deductions: [
      { reason: `${category} test deduction`, points: 6, severity: "warning" as const },
    ],
  };
}

const mockCategories = {
  seo: makeMockCategoryScore("seo", 88, "A"),
  performance: makeMockCategoryScore("performance", 74, "B"),
  accessibility: makeMockCategoryScore("accessibility", 82, "A"),
  content: makeMockCategoryScore("content", 79, "B"),
  mobile: makeMockCategoryScore("mobile", 85, "A"),
  ux: makeMockCategoryScore("ux", 80, "B"),
};

const mockScoreResult: ScoreResult = {
  overallScore: 81,
  overallGrade: "A",
  categories: mockCategories,
  dimensionScores: mockCategories,
  summary: {
    totalChecks: 66,
    passedChecks: 48,
    warningChecks: 12,
    failedChecks: 6,
    unavailableChecks: 0,
    totalIssues: 18,
    criticalIssues: 6,
    warningIssues: 12,
    infoIssues: 0,
  },
  weightsApplied: {
    seo: 0.2,
    performance: 0.25,
    accessibility: 0.2,
    content: 0.15,
    mobile: 0.1,
    ux: 0.1,
  },
  scoringMethod: "deterministic_weighted_proportional",
  calculatedAt: new Date().toISOString(),
  disclaimer: "Deterministic score calculated from DOM and network data.",
};

const mockCentralAnalysis: CentralAnalysisResult = {
  analyzedUrl: "https://dashboard-test.example.com",
  timestamp: new Date().toISOString(),
  executionTimeMs: 420,
  allIssues: [
    {
      id: "iss-1",
      category: "seo",
      severity: "critical",
      title: "Missing Canonical Tag",
      description: "No canonical link element was found in the head.",
      recommendation: "Add <link rel='canonical' href='https://dashboard-test.example.com' />",
      targetElement: "<head>",
      codeSnippet: "<head><title>Test</title></head>",
      impactScoreDeduction: 15,
    },
    {
      id: "iss-2",
      category: "performance",
      severity: "warning",
      title: "Largest Contentful Paint Exceeds 2.5s",
      description: "LCP measured at 2850ms on mobile emulation.",
      recommendation: "Optimize and compress the hero image asset.",
      impactScoreDeduction: 6,
    },
    {
      id: "iss-3",
      category: "accessibility",
      severity: "warning",
      title: "Images Missing Alt Text",
      description: "2 image elements missing alt attribute.",
      recommendation: "Provide meaningful alt attributes on all non-decorative images.",
      targetElement: "img.hero-graphic",
      codeSnippet: "<img src='/hero.png'>",
      impactScoreDeduction: 6,
    },
  ],
};

describe("SiteLens Real Dashboard & Reporting Pipeline", () => {
  const testReportId = "rep-dashboard-" + Date.now();

  test("builds and stores a complete audit report with real analyzer output", async () => {
    const report = buildAuditReport({
      id: testReportId,
      targetUrl: "https://dashboard-test.example.com",
      durationMs: 420,
      scores: mockScoreResult,
      analysis: mockCentralAnalysis,
      aiInterpretation: {
        isAvailable: true,
        status: "completed",
        provider: "ollama",
        model: "llama3:8b",
        data: {
          executiveSummary: "The website achieves a solid Grade A (81/100) with key action items in canonical configuration and hero image loading.",
          prioritizedExplanations: [
            {
              id: "iss-1",
              category: "seo",
              severity: "critical",
              title: "Missing Canonical Tag",
              explanation: "Search engines may index duplicate paths.",
              priority: 1,
            },
          ],
          businessImpactInterpretation: {
            technicalDebtSummary: "Minimal technical debt with standard HTML5 structure.",
            userExperienceImpact: "Slight latency on mobile hero render.",
            searchVisibilityImpact: "Indexation directives require canonical clarification.",
            conversionFriction: "No critical interaction barriers detected.",
          },
          actionableRecommendations: [
            {
              id: "rec-1",
              category: "seo",
              title: "Declare self-referencing canonical",
              technicalGuidance: "Inject link rel=canonical in head",
              priority: "high",
            },
          ],
          quickWins: [
            {
              title: "Add alt tags to hero image",
              impact: "Resolves accessibility violation",
              effort: "quick-fix",
              guidance: "Specify alt='Product Hero'",
            },
          ],
          mediumTermImprovements: [
            {
              title: "Compress hero image with WebP",
              impact: "Reduces LCP by ~300ms",
              effort: "moderate",
              guidance: "Convert PNG to WebP with next/image",
            },
          ],
          longerTermImprovements: [],
          growthRoadmap30Day: {
            phase1Days1To7: [
              { dayRange: "Days 1–3", task: "Configure canonical tags", targetDimension: "seo" },
            ],
            phase2Days8To14: [],
            phase3Days15To21: [],
            phase4Days22To30: [],
          },
        },
        generatedAt: new Date().toISOString(),
        executionDurationMs: 85,
      },
    });

    await defaultReportStorage.saveReport(report);

    // Verify report is retrievable by ID
    const retrieved = await defaultReportStorage.getReportById(testReportId);
    assert.ok(retrieved);
    assert.equal(retrieved.id, testReportId);
    assert.equal(retrieved.targetUrl, "https://dashboard-test.example.com");
    assert.equal(retrieved.scores.overallScore, 81);
    assert.equal(retrieved.scores.overallGrade, "A");
    assert.equal(retrieved.analysis.allIssues.length, 3);
    assert.ok(retrieved.aiInterpretation?.isAvailable);
    assert.equal(retrieved.aiInterpretation.data?.executiveSummary.includes("Grade A"), true);
  });

  test("lists report in audit history registry for dashboard", async () => {
    const history = await defaultReportStorage.listHistory(undefined, 50);
    assert.ok(history.length > 0);

    const found = history.find((h) => h.id === testReportId);
    assert.ok(found);
    assert.equal(found.targetUrl, "https://dashboard-test.example.com");
    assert.equal(found.overallScore, 81);
    assert.equal(found.overallGrade, "A");
    assert.equal(found.issuesCount.critical, 1);
    assert.equal(found.issuesCount.warning, 2);
  });

  test("preserves deterministic report functionality when AI is unavailable", async () => {
    const unavReportId = "rep-unav-" + Date.now();
    const unavReport = buildAuditReport({
      id: unavReportId,
      targetUrl: "https://no-ai.example.com",
      durationMs: 310,
      scores: mockScoreResult,
      analysis: mockCentralAnalysis,
      aiInterpretation: {
        isAvailable: false,
        status: "unavailable",
        provider: "ollama",
        model: "llama3:8b",
        unavailableReason: "Local Ollama daemon is offline.",
        generatedAt: new Date().toISOString(),
        executionDurationMs: 0,
      },
    });

    await defaultReportStorage.saveReport(unavReport);
    const retrieved = await defaultReportStorage.getReportById(unavReportId);

    assert.ok(retrieved);
    // Deterministic metrics are completely intact
    assert.equal(retrieved.scores.overallScore, 81);
    assert.equal(retrieved.scores.overallGrade, "A");
    assert.equal(retrieved.scores.categories.seo.score, 88);
    assert.equal(retrieved.analysis.allIssues.length, 3);
    // AI is marked unavailable gracefully
    assert.equal(retrieved.aiInterpretation?.isAvailable, false);
    assert.equal(retrieved.aiInterpretation?.status, "unavailable");
  });
});
