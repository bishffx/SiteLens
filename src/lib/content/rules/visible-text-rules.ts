import type { ContentCheckResult } from "../types";
import { extractWords } from "../readability";

/**
 * Checks visible text availability on the crawled page.
 */
export function checkVisibleTextAvailability(textContent: string | null | undefined): ContentCheckResult {
  if (textContent === null || textContent === undefined) {
    return {
      checkId: "content_visible_text",
      category: "content",
      name: "Visible Text Availability",
      status: "not_checked",
      severity: "none",
      explanation: "Unable to inspect text availability because text extraction produced no stream.",
      evidence: null,
      recommendation: "Ensure crawler has access to the page and JavaScript rendering is enabled if content is client-hydrated.",
    };
  }

  const clean = textContent.replace(/\s+/g, " ").trim();
  const words = extractWords(clean);
  const wordCount = words.length;
  const characterCount = clean.length;
  const sampleSnippet = clean.slice(0, 180) + (clean.length > 180 ? "..." : "");

  if (wordCount === 0) {
    return {
      checkId: "content_visible_text",
      category: "content",
      name: "Visible Text Availability",
      status: "fail",
      severity: "critical",
      explanation: "No visible text content could be extracted from the page.",
      evidence: {
        wordCount: 0,
        characterCount: 0,
        sampleSnippet: "",
      },
      recommendation: "Add descriptive visible HTML text to the page. If text is rendered dynamically via JavaScript, verify that client-side rendering completes before crawler snapshot.",
    };
  }

  if (wordCount < 30) {
    return {
      checkId: "content_visible_text",
      category: "content",
      name: "Visible Text Availability",
      status: "warning",
      severity: "warning",
      explanation: `Extremely limited visible text detected (${wordCount} words). The page may appear incomplete or empty to users and search crawlers.`,
      evidence: {
        wordCount,
        characterCount,
        sampleSnippet,
      },
      recommendation: "Expand the page content with informative body copy that clearly explains the page's purpose.",
    };
  }

  return {
    checkId: "content_visible_text",
    category: "content",
    name: "Visible Text Availability",
    status: "pass",
    severity: "none",
    explanation: `Substantial visible text is available for inspection (${wordCount.toLocaleString()} words).`,
    evidence: {
      wordCount,
      characterCount,
      sampleSnippet,
    },
    recommendation: null,
  };
}
