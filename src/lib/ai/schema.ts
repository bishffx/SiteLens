/**
 * Zod Validation Schemas for Ollama AI Interpretation Responses.
 * Enforces strict JSON contracts and prevents malformed AI responses.
 */

import { z } from "zod";

export const AIPrioritizedExplanationSchema = z.object({
  id: z.string().default(() => `issue-${Math.random().toString(36).slice(2, 7)}`),
  category: z.string().default("general"),
  severity: z.enum(["critical", "warning", "info"]).default("info"),
  title: z.string(),
  explanation: z.string(),
  priority: z.number().default(1),
});

export const AIBusinessImpactInterpretationSchema = z.object({
  technicalDebtSummary: z.string(),
  userExperienceImpact: z.string(),
  searchVisibilityImpact: z.string(),
  conversionFriction: z.string(),
});

export const AIActionableRecommendationSchema = z.object({
  id: z.string().default(() => `rec-${Math.random().toString(36).slice(2, 7)}`),
  category: z.string().default("general"),
  title: z.string(),
  technicalGuidance: z.string(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const AIImprovementItemSchema = z.object({
  title: z.string(),
  impact: z.string(),
  effort: z.enum(["quick-fix", "moderate", "significant"]),
  guidance: z.string(),
});

export const AIRoadmapMilestoneSchema = z.object({
  dayRange: z.string(),
  task: z.string(),
  targetDimension: z.string(),
});

export const AIGrowthRoadmap30DaySchema = z.object({
  phase1Days1To7: z.array(AIRoadmapMilestoneSchema).default([]),
  phase2Days8To14: z.array(AIRoadmapMilestoneSchema).default([]),
  phase3Days15To21: z.array(AIRoadmapMilestoneSchema).default([]),
  phase4Days22To30: z.array(AIRoadmapMilestoneSchema).default([]),
});

export const AIInterpretationDataSchema = z.object({
  executiveSummary: z.string(),
  prioritizedExplanations: z.array(AIPrioritizedExplanationSchema).default([]),
  businessImpactInterpretation: AIBusinessImpactInterpretationSchema,
  actionableRecommendations: z.array(AIActionableRecommendationSchema).default([]),
  quickWins: z.array(AIImprovementItemSchema).default([]),
  mediumTermImprovements: z.array(AIImprovementItemSchema).default([]),
  longerTermImprovements: z.array(AIImprovementItemSchema).default([]),
  growthRoadmap30Day: AIGrowthRoadmap30DaySchema,
});

export type ValidatedAIInterpretationData = z.infer<typeof AIInterpretationDataSchema>;
