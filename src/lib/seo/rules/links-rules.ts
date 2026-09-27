import type { SEOCheckResult } from "../types";
import type { ExtractedLink } from "../../types/crawler";

export function checkInternalLinks(links: ExtractedLink[]): SEOCheckResult {
  const internal = links.filter((l) => l.isInternal);

  if (internal.length === 0) {
    return {
      checkId: "seo_internal_links",
      category: "seo",
      name: "Internal Linking Architecture",
      status: "warning",
      severity: "warning",
      explanation: "No internal links to other site pages were identified on this page.",
      evidence: "0 internal links found",
      recommendation: "Add contextual internal links to facilitate search engine discovery and user navigation.",
    };
  }

  // Check for links with empty anchor text
  const emptyAnchors = internal.filter((l) => l.text.trim().length === 0);
  if (emptyAnchors.length > 0) {
    return {
      checkId: "seo_internal_links",
      category: "seo",
      name: "Internal Linking Architecture",
      status: "warning",
      severity: "warning",
      explanation: `Found ${emptyAnchors.length} internal link(s) without descriptive anchor text.`,
      evidence: { totalInternal: internal.length, emptyAnchorCount: emptyAnchors.length },
      recommendation: "Ensure internal links feature descriptive text rather than empty anchors.",
    };
  }

  return {
    checkId: "seo_internal_links",
    category: "seo",
    name: "Internal Linking Architecture",
    status: "pass",
    severity: "none",
    explanation: `Found ${internal.length} internal link(s) with discernible anchor text.`,
    evidence: `Internal Links: ${internal.length}`,
    recommendation: null,
  };
}

export function checkExternalLinks(links: ExtractedLink[]): SEOCheckResult {
  const external = links.filter((l) => !l.isInternal);

  if (external.length === 0) {
    return {
      checkId: "seo_external_links",
      category: "seo",
      name: "External Links Safety & References",
      status: "not_checked",
      severity: "none",
      explanation: "No outbound external links present on this page.",
      evidence: "0 external links",
      recommendation: null,
    };
  }

  // Check for target="_blank" without rel="noopener" or "noreferrer"
  const unsafeTargets = external.filter((l) => {
    if (l.target === "_blank") {
      const rel = (l.rel || "").toLowerCase();
      return !rel.includes("noopener") && !rel.includes("noreferrer");
    }
    return false;
  });

  if (unsafeTargets.length > 0) {
    return {
      checkId: "seo_external_links",
      category: "seo",
      name: "External Links Safety & References",
      status: "warning",
      severity: "warning",
      explanation: `${unsafeTargets.length} external link(s) open in a new tab without rel="noopener" or rel="noreferrer".`,
      evidence: { unsafeCount: unsafeTargets.length, totalExternal: external.length },
      recommendation: "Add rel=\"noopener\" or rel=\"noreferrer\" to external links utilizing target=\"_blank\".",
    };
  }

  return {
    checkId: "seo_external_links",
    category: "seo",
    name: "External Links Safety & References",
    status: "pass",
    severity: "none",
    explanation: `Discovered ${external.length} outbound link(s) conforming to security and reference standards.`,
    evidence: `External Links: ${external.length}`,
    recommendation: null,
  };
}
