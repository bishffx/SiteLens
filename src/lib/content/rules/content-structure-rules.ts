import * as cheerio from "cheerio";
import type { ContentCheckResult } from "../types";

/**
 * Checks semantic content structure (paragraphs, sections, articles, and lists) in HTML.
 */
export function checkContentStructure(html: string | undefined | null, wordCount: number): ContentCheckResult {
  if (!html || html.trim().length === 0) {
    return {
      checkId: "content_structure",
      category: "content",
      name: "Semantic Content Structure",
      status: "not_checked",
      severity: "none",
      explanation: "No HTML document was available to inspect semantic structure.",
      evidence: null,
      recommendation: null,
    };
  }

  const $ = cheerio.load(html);

  const paragraphCount = $("p").length;
  const sectionCount = $("section").length;
  const articleCount = $("article").length;
  const mainCount = $("main").length;
  const listCount = $("ul, ol").length;
  const listItemsCount = $("li").length;

  const evidence = {
    paragraphCount,
    sectionCount,
    articleCount,
    hasMainLandmark: mainCount > 0,
    listCount,
    listItemsCount,
  };

  // If page has substantial text (> 100 words) but zero paragraphs and zero articles/sections
  if (wordCount >= 100 && paragraphCount === 0 && articleCount === 0 && sectionCount === 0) {
    return {
      checkId: "content_structure",
      category: "content",
      name: "Semantic Content Structure",
      status: "warning",
      severity: "warning",
      explanation: `Page contains ${wordCount} words but lacks standard semantic content elements (<p>, <section>, <article>). Text appears to be housed entirely in generic <div> or <span> wrappers.`,
      evidence,
      recommendation: "Wrap textual sentences and copy in semantic <p> tags, and divide distinct thematic regions with <section> or <article> tags.",
    };
  }

  // If page has no structured paragraphs and word count is over 50
  if (wordCount >= 50 && paragraphCount === 0) {
    return {
      checkId: "content_structure",
      category: "content",
      name: "Semantic Content Structure",
      status: "warning",
      severity: "warning",
      explanation: "No standard <p> paragraph elements were detected on the page.",
      evidence,
      recommendation: "Structure body copy using standard <p> tags to improve accessibility, DOM outline, and readability.",
    };
  }

  return {
    checkId: "content_structure",
    category: "content",
    name: "Semantic Content Structure",
    status: "pass",
    severity: "none",
    explanation: `Content is organized using semantic HTML structural elements (${paragraphCount} paragraphs, ${sectionCount} sections, ${articleCount} articles, ${listCount} lists).`,
    evidence,
    recommendation: null,
  };
}
