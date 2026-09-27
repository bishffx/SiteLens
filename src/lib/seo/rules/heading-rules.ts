import type { SEOCheckResult } from "../types";
import type { ExtractedHeading } from "../../types/crawler";

export function checkH1Presence(h1Headings: string[]): SEOCheckResult {
  if (!h1Headings || h1Headings.length === 0) {
    return {
      checkId: "seo_h1_presence",
      category: "seo",
      name: "H1 Heading Presence",
      status: "fail",
      severity: "critical",
      explanation: "The page does not contain any <h1> heading element.",
      evidence: "Count: 0",
      recommendation: "Introduce a single descriptive <h1> heading communicating the core topic of this page.",
    };
  }

  if (h1Headings.length > 1) {
    return {
      checkId: "seo_h1_presence",
      category: "seo",
      name: "H1 Heading Presence",
      status: "warning",
      severity: "warning",
      explanation: `Found ${h1Headings.length} <h1> headings. Multiple <h1> headings dilute topical clarity.`,
      evidence: `Count: ${h1Headings.length} (${h1Headings.slice(0, 3).map((h) => `"${h}"`).join(", ")})`,
      recommendation: "Designate one primary <h1> and demote secondary section headings to <h2>.",
    };
  }

  return {
    checkId: "seo_h1_presence",
    category: "seo",
    name: "H1 Heading Presence",
    status: "pass",
    severity: "none",
    explanation: "Document has exactly one top-level <h1> heading.",
    evidence: `H1: "${h1Headings[0]}"`,
    recommendation: null,
  };
}

export function checkHeadingHierarchy(headings: {
  all?: ExtractedHeading[];
  h1?: string[];
  h2?: string[];
  h3?: string[];
  h4?: string[];
  h5?: string[];
  h6?: string[];
}): SEOCheckResult {
  let all = headings.all || [];
  if (all.length === 0) {
    const fallback: ExtractedHeading[] = [];
    (["h1", "h2", "h3", "h4", "h5", "h6"] as const).forEach((level) => {
      const items = headings[level] || [];
      items.forEach((text) => fallback.push({ level, text }));
    });
    all = fallback;
  }

  if (all.length === 0) {
    return {
      checkId: "seo_heading_hierarchy",
      category: "seo",
      name: "Heading Structure & Hierarchy",
      status: "warning",
      severity: "warning",
      explanation: "No heading elements (h1–h6) were detected on the page.",
      evidence: "0 headings found",
      recommendation: "Structure your page content logically with semantic headings (h1, h2, h3).",
    };
  }

  // Check for skipped heading levels (e.g. H1 followed directly by H3 without H2)
  const levelNumbers = all.map((h) => parseInt(h.level.replace("h", ""), 10));
  const skippedLevels: string[] = [];

  for (let i = 0; i < levelNumbers.length - 1; i++) {
    const current = levelNumbers[i];
    const next = levelNumbers[i + 1];

    if (next > current + 1) {
      skippedLevels.push(`H${current} -> H${next}`);
    }
  }

  if (skippedLevels.length > 0) {
    return {
      checkId: "seo_heading_hierarchy",
      category: "seo",
      name: "Heading Structure & Hierarchy",
      status: "warning",
      severity: "warning",
      explanation: `Detected improper heading level jump(s): ${skippedLevels.join(", ")}. Skipping heading levels impairs assistive navigation and logical outlining.`,
      evidence: { skippedJumps: skippedLevels, totalHeadings: all.length },
      recommendation: "Nest headings sequentially without skipping levels (e.g. follow <h2> with <h3>, not <h4>).",
    };
  }

  return {
    checkId: "seo_heading_hierarchy",
    category: "seo",
    name: "Heading Structure & Hierarchy",
    status: "pass",
    severity: "none",
    explanation: `All ${all.length} headings follow a sequential semantic hierarchy without skipped levels.`,
    evidence: `Total Headings: ${all.length}`,
    recommendation: null,
  };
}
