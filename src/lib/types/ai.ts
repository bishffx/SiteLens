/**
 * Provider-Independent AI Types and Interpretation Contracts for SiteLens AI.
 * Ollama is the local-first provider implementation.
 * Does not depend on external APIs, API keys, or cloud models.
 */

import type { AnalysisIssue } from "./analysis";
import type { ScoreResult } from "./scoring";

export interface AIPrioritizedExplanation {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  priority: number;
}

export interface AIBusinessImpactInterpretation {
  technicalDebtSummary: string;
  userExperienceImpact: string;
  searchVisibilityImpact: string;
  conversionFriction: string;
}

export interface AIActionableRecommendation {
  id: string;
  category: string;
  title: string;
  technicalGuidance: string;
  priority: "high" | "medium" | "low";
}

export interface AIImprovementItem {
  title: string;
  impact: string;
  effort: "quick-fix" | "moderate" | "significant";
  guidance: string;
}

export interface AIRoadmapMilestone {
  dayRange: string;
  task: string;
  targetDimension: string;
}

export interface AIGrowthRoadmap30Day {
  phase1Days1To7: AIRoadmapMilestone[];
  phase2Days8To14: AIRoadmapMilestone[];
  phase3Days15To21: AIRoadmapMilestone[];
  phase4Days22To30: AIRoadmapMilestone[];
}

export interface AIInterpretationData {
  executiveSummary: string;
  prioritizedExplanations: AIPrioritizedExplanation[];
  businessImpactInterpretation: AIBusinessImpactInterpretation;
  actionableRecommendations: AIActionableRecommendation[];
  quickWins: AIImprovementItem[];
  mediumTermImprovements: AIImprovementItem[];
  longerTermImprovements: AIImprovementItem[];
  growthRoadmap30Day: AIGrowthRoadmap30Day;
}

export interface AIInterpretationReport {
  isAvailable: boolean;
  status: "completed" | "unavailable" | "skipped" | "failed";
  provider: string;
  model: string;
  unavailableReason?: string;
  data?: AIInterpretationData;
  generatedAt: string;
  executionDurationMs: number;
}

// Backward-compatible alias
export type AIInterpretationResult = AIInterpretationReport;

export interface AIInterpretationRequest {
  url: string;
  scores: ScoreResult;
  topIssues: AnalysisIssue[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AIHealthStatus {
  isAvailable: boolean;
  provider: string;
  endpoint: string;
  availableModels: string[];
  activeModel?: string;
  errorMessage?: string;
}

export interface IAIProvider {
  readonly providerName: string;
  checkHealth(): Promise<AIHealthStatus>;
  interpretAudit(request: AIInterpretationRequest): Promise<AIInterpretationReport>;
}
