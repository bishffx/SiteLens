import type { SEOCheckResult } from "../types";

export function checkUrlStructure(finalUrl: string): SEOCheckResult {
  try {
    const parsed = new URL(finalUrl);
    const pathname = parsed.pathname;
    const issues: string[] = [];

    // Length check
    if (finalUrl.length > 100) {
      issues.push(`URL length (${finalUrl.length} chars) exceeds 100 characters`);
    }

    // Uppercase in pathname check
    if (/[A-Z]/.test(pathname)) {
      issues.push("URL path contains uppercase characters (can cause duplicate indexing)");
    }

    // Underscore in pathname check
    if (pathname.includes("_")) {
      issues.push("URL path contains underscores; hyphens are preferred word separators");
    }

    // Excessive query parameters
    const paramCount = Array.from(parsed.searchParams.keys()).length;
    if (paramCount > 3) {
      issues.push(`Excessive query parameters (${paramCount} parameters)`);
    }

    if (issues.length > 0) {
      return {
        checkId: "seo_url_structure",
        category: "seo",
        name: "URL Cleanliness & Structure",
        status: "warning",
        severity: "info",
        explanation: `Suboptimal URL format detected: ${issues.join("; ")}.`,
        evidence: { url: finalUrl, issues },
        recommendation: "Use short, lowercase, hyphen-separated URLs without unnecessary URL parameters.",
      };
    }

    return {
      checkId: "seo_url_structure",
      category: "seo",
      name: "URL Cleanliness & Structure",
      status: "pass",
      severity: "none",
      explanation: "URL structure is clean, lowercase, and concise.",
      evidence: finalUrl,
      recommendation: null,
    };
  } catch {
    return {
      checkId: "seo_url_structure",
      category: "seo",
      name: "URL Cleanliness & Structure",
      status: "fail",
      severity: "critical",
      explanation: "Malformed URL could not be parsed.",
      evidence: finalUrl,
      recommendation: "Ensure URLs follow RFC standard formatting.",
    };
  }
}
