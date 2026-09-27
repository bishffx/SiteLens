import { z } from "zod";
import { AuditCategorySchema } from "./audit-request";

export const IssueSeveritySchema = z.enum(["critical", "warning", "info"]);

export const AnalysisIssueSchema = z.object({
  id: z.string().min(1),
  category: AuditCategorySchema,
  severity: IssueSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  recommendation: z.string().min(1),
  targetElement: z.string().optional(),
  codeSnippet: z.string().optional(),
  impactScoreDeduction: z.number().min(0).max(100),
  documentationUrl: z.string().url().optional(),
});

export const MetricMeasurementSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  unit: z.enum(["ms", "bytes", "count", "ratio", "score"]),
  thresholdGood: z.number(),
  thresholdPoor: z.number(),
  actualStatus: z.enum(["good", "needs-improvement", "poor"]),
});

export const BaseDimensionResultSchema = z.object({
  category: AuditCategorySchema,
  status: z.enum(["pending", "running", "completed", "skipped", "failed"]),
  executionTimeMs: z.number().min(0),
  issues: z.array(AnalysisIssueSchema),
  metrics: z.record(MetricMeasurementSchema),
  passedChecks: z.number().min(0),
  totalChecks: z.number().min(0),
  error: z.string().optional(),
});
