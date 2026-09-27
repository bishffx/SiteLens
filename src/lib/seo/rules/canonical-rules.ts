import type { SEOCheckResult } from "../types";

export function checkCanonicalUrl(
  canonicalUrl: string | null,
  finalUrl: string
): SEOCheckResult {
  if (!canonicalUrl || canonicalUrl.trim().length === 0) {
    return {
      checkId: "seo_canonical_url",
      category: "seo",
      name: "Canonical URL Tag",
      status: "warning",
      severity: "warning",
      explanation: "No canonical link (<link rel=\"canonical\">) was specified for this page.",
      evidence: null,
      recommendation: `Add <link rel="canonical" href="${finalUrl}"> to prevent duplicate content ambiguities across search engines.`,
    };
  }

  try {
    const parsedCanonical = new URL(canonicalUrl);
    if (!parsedCanonical.protocol.startsWith("http")) {
      return {
        checkId: "seo_canonical_url",
        category: "seo",
        name: "Canonical URL Tag",
        status: "fail",
        severity: "critical",
        explanation: "Canonical tag does not specify a valid HTTP or HTTPS protocol.",
        evidence: canonicalUrl,
        recommendation: "Ensure the canonical URL is an absolute, secure HTTPS address.",
      };
    }
  } catch {
    return {
      checkId: "seo_canonical_url",
      category: "seo",
      name: "Canonical URL Tag",
      status: "fail",
      severity: "critical",
      explanation: "Canonical URL is malformed and could not be parsed.",
      evidence: canonicalUrl,
      recommendation: "Provide a valid, fully qualified absolute URL in the canonical tag.",
    };
  }

  return {
    checkId: "seo_canonical_url",
    category: "seo",
    name: "Canonical URL Tag",
    status: "pass",
    severity: "none",
    explanation: "Document declares an absolute canonical URL.",
    evidence: canonicalUrl,
    recommendation: null,
  };
}
