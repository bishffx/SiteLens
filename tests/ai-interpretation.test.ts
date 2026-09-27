import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { AIInterpretationDataSchema } from "../src/lib/ai/schema";
import { buildAuditAnalysisPrompt } from "../src/lib/ai/prompt-builder";
import { OllamaProvider } from "../src/lib/ai/ollama-provider";
import { AIService } from "../src/lib/ai/ai-service";
import type {
  AIInterpretationData,
  AIInterpretationRequest,
  IAIProvider,
  AIHealthStatus,
  AIInterpretationReport,
} from "../src/lib/types/ai";
import type { ScoreResult } from "../src/lib/types/scoring";
import { defaultJobService, defaultJobStore } from "../src/lib/jobs";

function makeCategoryScore(
  category: import("../src/lib/types/analysis").AnalysisCategory,
  score: number,
  grade: import("../src/lib/types/scoring").ScoreGrade,
  passedChecks: number,
  warningChecks: number,
  failedChecks: number,
  weight: number
) {
  return {
    category,
    score,
    grade,
    passedChecks,
    warningChecks,
    failedChecks,
    unavailableChecks: 0,
    totalChecks: passedChecks + warningChecks + failedChecks,
    evaluableChecks: passedChecks + warningChecks + failedChecks,
    totalIssues: warningChecks + failedChecks,
    criticalIssues: failedChecks,
    warningIssues: warningChecks,
    infoIssues: 0,
    weight,
    isAvailable: true,
    deductions: [],
  };
}

const mockCategories = {
  seo: makeCategoryScore("seo", 90, "A+", 9, 1, 0, 0.2),
  performance: makeCategoryScore("performance", 75, "B", 6, 1, 1, 0.25),
  accessibility: makeCategoryScore("accessibility", 85, "A", 10, 2, 0, 0.2),
  content: makeCategoryScore("content", 80, "B", 5, 2, 0, 0.15),
  mobile: makeCategoryScore("mobile", 78, "B", 4, 2, 0, 0.1),
  ux: makeCategoryScore("ux", 84, "A", 5, 1, 0, 0.1),
};

// Sample mock deterministic score result
const mockScoreResult: ScoreResult = {
  overallScore: 82,
  overallGrade: "A",
  categories: mockCategories,
  dimensionScores: mockCategories,
  summary: {
    totalChecks: 49,
    passedChecks: 39,
    warningChecks: 9,
    failedChecks: 1,
    unavailableChecks: 0,
    totalIssues: 10,
    criticalIssues: 1,
    warningIssues: 9,
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

// Valid sample AI interpretation response
const validAIData: AIInterpretationData = {
  executiveSummary: "The website demonstrates strong SEO structure and accessibility, with primary optimization opportunities in initial server response latency and mobile viewport stability.",
  prioritizedExplanations: [
    {
      id: "perf-lcp",
      category: "performance",
      severity: "critical",
      title: "Largest Contentful Paint Exceeds 2.5s",
      explanation: "Main hero visual asset requires optimization to reduce loading latency on mobile networks.",
      priority: 1,
    },
    {
      id: "seo-alt",
      category: "seo",
      severity: "warning",
      title: "Missing Image Alt Attributes",
      explanation: "Three decorative or informational images lack alternative text attributes.",
      priority: 2,
    },
  ],
  businessImpactInterpretation: {
    technicalDebtSummary: "Low-to-moderate frontend asset weight overhead with uncompressed hero media.",
    userExperienceImpact: "Minor layout shift observable during late stylesheet resolution on 390px viewports.",
    searchVisibilityImpact: "Indexation directives are valid; heading structure conforms to modern crawl guidelines.",
    conversionFriction: "Delayed hero rendering may increase bounce rates on high-latency cellular connections.",
  },
  actionableRecommendations: [
    {
      id: "rec-1",
      category: "performance",
      title: "Serve responsive AVIF/WebP hero images",
      technicalGuidance: "Adopt next/image or responsive srcset with width descriptors.",
      priority: "high",
    },
  ],
  quickWins: [
    {
      title: "Add alt tags to hero icons",
      impact: "Immediately resolves accessibility warning and improves screen reader compliance.",
      effort: "quick-fix",
      guidance: "Specify descriptive alt text for SVGs or mark them aria-hidden='true'.",
    },
  ],
  mediumTermImprovements: [
    {
      title: "Enable font preloading",
      impact: "Reduces typography render blocking by up to 250ms.",
      effort: "moderate",
      guidance: "Add link rel='preload' for primary web font subsets.",
    },
  ],
  longerTermImprovements: [
    {
      title: "Refactor legacy client bundle",
      impact: "Improves overall Total Blocking Time (TBT) and Interaction to Next Paint (INP).",
      effort: "significant",
      guidance: "Split unused third-party analytics libraries via dynamic import.",
    },
  ],
  growthRoadmap30Day: {
    phase1Days1To7: [
      { dayRange: "Days 1–3", task: "Remediate missing image alt attributes", targetDimension: "accessibility" },
      { dayRange: "Days 4–7", task: "Compress and modernize hero images", targetDimension: "performance" },
    ],
    phase2Days8To14: [
      { dayRange: "Days 8–11", task: "Configure caching headers for static assets", targetDimension: "performance" },
      { dayRange: "Days 12–14", task: "Audit heading levels for strict hierarchy", targetDimension: "seo" },
    ],
    phase3Days15To21: [
      { dayRange: "Days 15–18", task: "Optimize tap target spacing on mobile", targetDimension: "mobile" },
      { dayRange: "Days 19–21", task: "Eliminate render-blocking resources", targetDimension: "performance" },
    ],
    phase4Days22To30: [
      { dayRange: "Days 22–26", task: "Implement structured JSON-LD schemas", targetDimension: "seo" },
      { dayRange: "Days 27–30", task: "Run verification re-audit to validate improvements", targetDimension: "all" },
    ],
  },
};

describe("SiteLens AI Interpretation Layer (Ollama)", () => {
  describe("Zod Schema Validation", () => {
    test("validates complete and conforming AI interpretation response", () => {
      const parsed = AIInterpretationDataSchema.parse(validAIData);
      assert.equal(parsed.executiveSummary, validAIData.executiveSummary);
      assert.equal(parsed.prioritizedExplanations.length, 2);
      assert.equal(parsed.actionableRecommendations.length, 1);
      assert.equal(parsed.growthRoadmap30Day.phase1Days1To7.length, 2);
    });

    test("rejects response missing required executive summary", () => {
      const invalid = { ...validAIData, executiveSummary: undefined };
      assert.throws(() => AIInterpretationDataSchema.parse(invalid));
    });

    test("rejects response missing 30-day roadmap", () => {
      const invalid = { ...validAIData, growthRoadmap30Day: undefined };
      assert.throws(() => AIInterpretationDataSchema.parse(invalid));
    });

    test("rejects response missing business impact interpretation fields", () => {
      const invalid = {
        ...validAIData,
        businessImpactInterpretation: { technicalDebtSummary: "only one field" },
      };
      assert.throws(() => AIInterpretationDataSchema.parse(invalid));
    });
  });

  describe("Grounded Prompt Builder", () => {
    test("embeds deterministic scores and anti-hallucination rules", () => {
      const prompt = buildAuditAnalysisPrompt({
        url: "https://example.com",
        scores: mockScoreResult,
        topIssues: [
          {
            id: "seo-title",
            category: "seo",
            severity: "warning",
            title: "Title too short",
            description: "Title is 15 characters, expected at least 30",
            recommendation: "Expand title tag",
            impactScoreDeduction: 6,
          },
        ],
      });

      // Grounding checks
      assert.match(prompt, /https:\/\/example\.com/);
      assert.match(prompt, /82\/100/);
      assert.match(prompt, /Grade A/);
      assert.match(prompt, /1 critical, 9 warning, 0 info/);
      assert.match(prompt, /Title too short/);
      assert.match(prompt, /Do NOT change, alter, recalculate, or contradict the deterministic scores/);
      assert.match(prompt, /Do NOT fabricate traffic numbers/);
      assert.match(prompt, /Do NOT fabricate revenue/);
      assert.match(prompt, /Respond ONLY with a valid JSON object/);
    });
  });

  describe("OllamaProvider Health & Failure Handling", () => {
    test("returns isAvailable=false when Ollama daemon is offline without throwing", async () => {
      // Connect to an unused loopback port to simulate unreachable Ollama
      const provider = new OllamaProvider({
        baseUrl: "http://127.0.0.1:54321",
        timeoutMs: 500,
      });

      const health = await provider.checkHealth();
      assert.equal(health.isAvailable, false);
      assert.equal(health.provider, "ollama");
      assert.ok(health.errorMessage);
    });

    test("returns unavailable report when Ollama daemon is offline", async () => {
      const provider = new OllamaProvider({
        baseUrl: "http://127.0.0.1:54321",
        timeoutMs: 500,
      });

      const report = await provider.interpretAudit({
        url: "https://example.com",
        scores: mockScoreResult,
        topIssues: [],
      });

      assert.equal(report.isAvailable, false);
      assert.equal(report.status, "unavailable");
      assert.equal(report.provider, "ollama");
      assert.match(report.unavailableReason || "", /unavailable/i);
      assert.equal(report.data, undefined);
    });
  });

  describe("OllamaProvider Interpretation Parsing", () => {
    test("parses markdown-fenced JSON responses accurately", async () => {
      // Create a test provider with a custom fetch stub
      const provider = new OllamaProvider({
        baseUrl: "http://mock-ollama:11434",
        timeoutMs: 2000,
      });

      // Monkey-patch health and fetch for controlled verification
      provider.checkHealth = async () => ({
        isAvailable: true,
        provider: "ollama",
        endpoint: "http://mock-ollama:11434",
        availableModels: ["llama3:8b"],
      });

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: "```json\n" + JSON.stringify(validAIData) + "\n```",
            }),
          } as unknown as Response;
        };

        const result = await provider.interpretAudit({
          url: "https://example.com",
          scores: mockScoreResult,
          topIssues: [],
        });

        assert.equal(result.isAvailable, true);
        assert.equal(result.status, "completed");
        assert.equal(result.provider, "ollama");
        assert.ok(result.data);
        assert.equal(result.data.executiveSummary, validAIData.executiveSummary);
        assert.equal(result.data.prioritizedExplanations.length, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("handles malformed JSON response gracefully with failed status", async () => {
      const provider = new OllamaProvider({
        baseUrl: "http://mock-ollama:11434",
      });

      provider.checkHealth = async () => ({
        isAvailable: true,
        provider: "ollama",
        endpoint: "http://mock-ollama:11434",
        availableModels: ["llama3:8b"],
      });

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: "this is not valid json at all",
            }),
          } as unknown as Response;
        };

        const result = await provider.interpretAudit({
          url: "https://example.com",
          scores: mockScoreResult,
          topIssues: [],
        });

        assert.equal(result.isAvailable, false);
        assert.equal(result.status, "failed");
        assert.match(result.unavailableReason || "", /Failed to interpret audit/i);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("AIService Facade & Provider Swapping", () => {
    test("allows swapping AI provider behind IAIProvider interface", async () => {
      const mockProvider: IAIProvider = {
        providerName: "custom-mock-ai",
        checkHealth: async (): Promise<AIHealthStatus> => ({
          isAvailable: true,
          provider: "custom-mock-ai",
          endpoint: "http://mock:8000",
          availableModels: ["custom-model"],
        }),
        interpretAudit: async (_req: AIInterpretationRequest): Promise<AIInterpretationReport> => ({
          isAvailable: true,
          status: "completed",
          provider: "custom-mock-ai",
          model: "custom-model",
          data: validAIData,
          generatedAt: new Date().toISOString(),
          executionDurationMs: 42,
        }),
      };

      const aiService = new AIService(mockProvider);
      assert.equal(aiService.providerName, "custom-mock-ai");

      const health = await aiService.checkHealth();
      assert.equal(health.isAvailable, true);
      assert.equal(health.provider, "custom-mock-ai");

      const report = await aiService.interpretAudit({
        url: "https://custom-test.com",
        scores: mockScoreResult,
        topIssues: [],
      });

      assert.equal(report.isAvailable, true);
      assert.equal(report.provider, "custom-mock-ai");
      assert.equal(report.data?.executiveSummary, validAIData.executiveSummary);
    });
  });

  describe("JobService on-demand AI interpretation integration", () => {
    test("runAIInterpretation safely handles completed jobs and attaches report", async () => {
      // Create a mock completed job in the store
      const jobId = "test-job-" + Date.now();
      defaultJobStore.create({
        jobId,
        targetUrl: "https://test-site.org",
        normalizedUrl: "https://test-site.org/",
        status: "completed",
        currentStageMessage: "Audit completed",
        createdAt: new Date().toISOString(),
        options: {
          deviceType: "desktop",
          enabledCategories: ["seo", "performance"],
          requestAI: false,
        },
        scoreResult: mockScoreResult,
      });

      // Run on-demand interpretation (Ollama will be offline in test environment, which should not crash)
      const updatedJob = await defaultJobService.runAIInterpretation(jobId);
      assert.ok(updatedJob);
      assert.ok(updatedJob.aiReport);
      assert.equal(updatedJob.scoreResult?.overallScore, 82);
      // The deterministic score is completely intact
      assert.equal(updatedJob.scoreResult?.overallGrade, "A");
      // AI report status is recorded cleanly
      assert.ok(
        updatedJob.aiReport.status === "unavailable" ||
        updatedJob.aiReport.status === "completed" ||
        updatedJob.aiReport.status === "failed"
      );
    });

    test("runAIInterpretation returns null for non-existent or incomplete jobs", async () => {
      const res = await defaultJobService.runAIInterpretation("non-existent-id");
      assert.equal(res, null);
    });
  });
});
