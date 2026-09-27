import { z } from "zod";
import { UrlInputSchema } from "./url";

export const AuditCategorySchema = z.enum([
  "seo",
  "performance",
  "accessibility",
  "content",
  "mobile",
  "ux",
]);

export const AuditRequestSchema = z.object({
  url: UrlInputSchema,
  deviceType: z.enum(["desktop", "mobile"]).default("desktop"),
  enabledCategories: z
    .array(AuditCategorySchema)
    .min(1, "At least one category must be enabled")
    .default(["seo", "performance", "accessibility", "content", "mobile", "ux"]),
  crawlOptions: z
    .object({
      maxDepth: z.number().int().min(1).max(3).default(1),
      maxPages: z.number().int().min(1).max(10).default(1),
      timeoutMs: z.number().int().min(5000).max(60000).default(30000),
      captureScreenshots: z.boolean().default(false),
    })
    .default({
      maxDepth: 1,
      maxPages: 1,
      timeoutMs: 30000,
      captureScreenshots: false,
    }),
  requestAI: z.boolean().default(false),
});

export type AuditRequestInput = z.input<typeof AuditRequestSchema>;
export type AuditRequest = z.infer<typeof AuditRequestSchema>;
