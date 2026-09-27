import type { SEOCheckResult } from "../types";
import type { StructuredDataEntry } from "../../types/crawler";

export function checkStructuredData(
  structuredData: StructuredDataEntry[]
): SEOCheckResult {
  if (!structuredData || structuredData.length === 0) {
    return {
      checkId: "seo_structured_data",
      category: "seo",
      name: "Structured Data (Schema.org / JSON-LD)",
      status: "warning",
      severity: "info",
      explanation: "No JSON-LD structured data scripts discovered in the HTML markup.",
      evidence: "0 structured data items",
      recommendation: "Add Schema.org JSON-LD markup (e.g. WebSite, Organization, Article, or Product) to be eligible for Google rich results.",
    };
  }

  const invalidEntries = structuredData.filter(
    (s) =>
      (s as { isValidJson?: boolean; isValid?: boolean }).isValidJson === false ||
      (s as { isValidJson?: boolean; isValid?: boolean }).isValid === false
  );
  if (invalidEntries.length > 0) {
    return {
      checkId: "seo_structured_data",
      category: "seo",
      name: "Structured Data (Schema.org / JSON-LD)",
      status: "fail",
      severity: "critical",
      explanation: `Found ${invalidEntries.length} JSON-LD structured data block(s) with invalid JSON syntax.`,
      evidence: { invalidCount: invalidEntries.length },
      recommendation: "Validate and fix JSON syntax errors within your <script type=\"application/ld+json\"> blocks.",
    };
  }

  const schemaTypes = structuredData
    .map(
      (s) =>
        s.type ||
        (s.parsed as Record<string, unknown> | null)?.["@type"] ||
        "SchemaItem"
    )
    .map(String);

  return {
    checkId: "seo_structured_data",
    category: "seo",
    name: "Structured Data (Schema.org / JSON-LD)",
    status: "pass",
    severity: "none",
    explanation: `Found ${structuredData.length} valid structured data block(s) (types: ${schemaTypes.join(", ")}).`,
    evidence: { types: schemaTypes, count: structuredData.length },
    recommendation: null,
  };
}
