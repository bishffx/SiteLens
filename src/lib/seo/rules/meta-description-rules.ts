import type { SEOCheckResult } from "../types";

export function checkMetaDescriptionPresence(
  metaDescription: string | null
): SEOCheckResult {
  if (!metaDescription || metaDescription.trim().length === 0) {
    return {
      checkId: "seo_meta_description_presence",
      category: "seo",
      name: "Meta Description Presence",
      status: "fail",
      severity: "critical",
      explanation: "No meta description tag (<meta name=\"description\">) was discovered in the document head.",
      evidence: null,
      recommendation: "Add a concise, compelling meta description to improve click-through rates from search results.",
    };
  }

  return {
    checkId: "seo_meta_description_presence",
    category: "seo",
    name: "Meta Description Presence",
    status: "pass",
    severity: "none",
    explanation: "Document provides a meta description.",
    evidence: metaDescription,
    recommendation: null,
  };
}

export function checkMetaDescriptionLength(
  metaDescription: string | null
): SEOCheckResult {
  if (!metaDescription || metaDescription.trim().length === 0) {
    return {
      checkId: "seo_meta_description_length",
      category: "seo",
      name: "Meta Description Length",
      status: "not_checked",
      severity: "none",
      explanation: "Meta description length cannot be evaluated because the tag is missing.",
      evidence: null,
      recommendation: null,
    };
  }

  const length = metaDescription.trim().length;

  if (length < 120) {
    return {
      checkId: "seo_meta_description_length",
      category: "seo",
      name: "Meta Description Length",
      status: "warning",
      severity: "warning",
      explanation: `Meta description is ${length} characters, which is shorter than the optimal 120-character minimum.`,
      evidence: `Length: ${length} characters ("${metaDescription}")`,
      recommendation: "Provide more descriptive context to reach between 120 and 160 characters for optimal search snippet display.",
    };
  }

  if (length > 160) {
    return {
      checkId: "seo_meta_description_length",
      category: "seo",
      name: "Meta Description Length",
      status: "warning",
      severity: "warning",
      explanation: `Meta description is ${length} characters, exceeding the 160-character snippet truncation limit.`,
      evidence: `Length: ${length} characters ("${metaDescription}")`,
      recommendation: "Shorten the meta description to under 160 characters to avoid truncation on desktop and mobile SERPs.",
    };
  }

  return {
    checkId: "seo_meta_description_length",
    category: "seo",
    name: "Meta Description Length",
    status: "pass",
    severity: "none",
    explanation: `Meta description length (${length} characters) is within the optimal 120–160 character range.`,
    evidence: `Length: ${length} characters`,
    recommendation: null,
  };
}
