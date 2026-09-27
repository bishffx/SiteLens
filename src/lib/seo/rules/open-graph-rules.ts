import type { SEOCheckResult } from "../types";

export function checkOpenGraphMetadata(
  openGraph: Record<string, string> | null | undefined
): SEOCheckResult {
  const og = openGraph || {};
  const keys = Object.keys(og);

  if (keys.length === 0) {
    return {
      checkId: "seo_open_graph_metadata",
      category: "seo",
      name: "Open Graph Social Metadata",
      status: "warning",
      severity: "info",
      explanation: "No Open Graph meta tags (og:title, og:description, og:image) discovered.",
      evidence: "0 Open Graph tags",
      recommendation: "Implement basic Open Graph tags (og:title, og:description, og:image, og:url) for rich social sharing previews.",
    };
  }

  const hasTitle = Boolean(og["og:title"] || og["title"]);
  const hasDesc = Boolean(og["og:description"] || og["description"]);
  const hasImage = Boolean(og["og:image"] || og["image"]);

  const missing: string[] = [];
  if (!hasTitle) missing.push("og:title");
  if (!hasDesc) missing.push("og:description");
  if (!hasImage) missing.push("og:image");

  if (missing.length > 0) {
    return {
      checkId: "seo_open_graph_metadata",
      category: "seo",
      name: "Open Graph Social Metadata",
      status: "warning",
      severity: "info",
      explanation: `Open Graph implementation is incomplete. Missing tags: ${missing.join(", ")}.`,
      evidence: { presentTags: keys, missingTags: missing },
      recommendation: `Add the missing Open Graph properties: ${missing.join(", ")}.`,
    };
  }

  return {
    checkId: "seo_open_graph_metadata",
    category: "seo",
    name: "Open Graph Social Metadata",
    status: "pass",
    severity: "none",
    explanation: "Core Open Graph tags (og:title, og:description, og:image) are present.",
    evidence: {
      ogTitle: og["og:title"] || og["title"],
      ogImage: og["og:image"] || og["image"],
    },
    recommendation: null,
  };
}
