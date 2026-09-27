import { z } from "zod";

export const ReportCompareRequestSchema = z.object({
  baselineAuditId: z.string().min(1, "Baseline audit ID is required"),
  currentAuditId: z.string().min(1, "Current audit ID is required"),
});

export const HistoryQuerySchema = z.object({
  url: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReportCompareRequest = z.infer<typeof ReportCompareRequestSchema>;
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
