import type { ContentCheckResult } from "../types";
import { extractWords } from "../readability";

/**
 * Evaluates thin-content signals based on visible word volume and text-to-HTML ratio.
 */
export function checkThinContent(
  textContent: string | undefined | null,
  html: string | undefined | null
): ContentCheckResult {
  if (textContent === null || textContent === undefined) {
    return {
      checkId: "content_thin_content",
      category: "content",
      name: "Thin Content Signals",
      status: "not_checked",
      severity: "none",
      explanation: "No extracted text available to evaluate content depth.",
      evidence: null,
      recommendation: null,
    };
  }

  const words = extractWords(textContent);
  const wordCount = words.length;

  const textBytes = Buffer.byteLength(textContent || "", "utf8");
  const htmlBytes = Buffer.byteLength(html || "", "utf8");
  const textToHtmlRatioPercent =
    htmlBytes > 0 ? Math.round((textBytes / htmlBytes) * 1000) / 10 : 0;

  const evidence = {
    wordCount,
    textBytes,
    htmlBytes,
    textToHtmlRatioPercent,
  };

  if (wordCount < 100) {
    return {
      checkId: "content_thin_content",
      category: "content",
      name: "Thin Content Signals",
      status: "fail",
      severity: "critical",
      explanation: `Thin content detected: page provides only ${wordCount} words of visible text. Search engines and users typically favor pages with deeper topical coverage.`,
      evidence,
      recommendation: "Provide comprehensive, unique text content answering user questions and elaborating on the page's core subject.",
    };
  }

  if (wordCount < 250) {
    return {
      checkId: "content_thin_content",
      category: "content",
      name: "Thin Content Signals",
      status: "warning",
      severity: "warning",
      explanation: `Modest text depth (${wordCount} words). This volume may be adequate for sign-in or utility pages, but is considered thin for informational or landing pages.`,
      evidence,
      recommendation: "If this page is intended to rank organically or explain a product, aim for at least 300–500 words of informative body copy.",
    };
  }

  if (htmlBytes > 50000 && textToHtmlRatioPercent < 3.0) {
    return {
      checkId: "content_thin_content",
      category: "content",
      name: "Thin Content Signals",
      status: "warning",
      severity: "warning",
      explanation: `Low text-to-HTML ratio (${textToHtmlRatioPercent}%). The page contains substantial code/markup overhead (${Math.round(htmlBytes / 1024)} KB) relative to its visible text volume (${wordCount} words).`,
      evidence,
      recommendation: "Streamline inline scripts, styles, and bloated DOM wrappers to improve content-to-code efficiency.",
    };
  }

  return {
    checkId: "content_thin_content",
    category: "content",
    name: "Thin Content Signals",
    status: "pass",
    severity: "none",
    explanation: `Substantial text volume detected (${wordCount.toLocaleString()} words, ${textToHtmlRatioPercent}% text-to-HTML ratio).`,
    evidence,
    recommendation: null,
  };
}
