import * as cheerio from "cheerio";
import type { ContentCheckResult } from "../types";
import { extractWords } from "../readability";

/**
 * Analyzes paragraph structure, lengths, and scannability.
 */
export function checkParagraphStructure(
  html: string | undefined | null,
  totalWordCount: number
): ContentCheckResult {
  if (!html || html.trim().length === 0) {
    return {
      checkId: "content_paragraph_structure",
      category: "content",
      name: "Paragraph Structure & Length",
      status: "not_checked",
      severity: "none",
      explanation: "No HTML available to inspect paragraph elements.",
      evidence: null,
      recommendation: null,
    };
  }

  const $ = cheerio.load(html);
  const pElements = $("p");
  const paragraphCount = pElements.length;

  if (paragraphCount === 0) {
    if (totalWordCount < 50) {
      return {
        checkId: "content_paragraph_structure",
        category: "content",
        name: "Paragraph Structure & Length",
        status: "not_checked",
        severity: "none",
        explanation: `Insufficient text (${totalWordCount} words) and no <p> tags present to evaluate paragraph structure.`,
        evidence: {
          totalWordCount,
          paragraphCount: 0,
        },
        recommendation: null,
      };
    }

    return {
      checkId: "content_paragraph_structure",
      category: "content",
      name: "Paragraph Structure & Length",
      status: "warning",
      severity: "warning",
      explanation: `Page has ${totalWordCount} words but contains zero <p> paragraph elements. Copy may be rendered inside unsemantic containers.`,
      evidence: {
        totalWordCount,
        paragraphCount: 0,
      },
      recommendation: "Wrap body copy in semantic <p> tags to improve accessibility, rhythm, and typography.",
    };
  }

  const paragraphWordCounts: number[] = [];
  let longestWords = 0;
  let longestSnippet = "";
  let excessiveParagraphsCount = 0;

  pElements.each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const words = extractWords(text);
    if (words.length === 0) return;

    paragraphWordCounts.push(words.length);

    if (words.length > longestWords) {
      longestWords = words.length;
      longestSnippet = text.slice(0, 160) + (text.length > 160 ? "..." : "");
    }

    if (words.length > 200) {
      excessiveParagraphsCount++;
    }
  });

  const validParagraphs = paragraphWordCounts.length;
  if (validParagraphs === 0) {
    return {
      checkId: "content_paragraph_structure",
      category: "content",
      name: "Paragraph Structure & Length",
      status: "warning",
      severity: "warning",
      explanation: "Detected <p> tags on page, but all were empty or contained no words.",
      evidence: {
        emptyPTagsCount: paragraphCount,
      },
      recommendation: "Remove empty <p> tags from the DOM or populate them with meaningful content.",
    };
  }

  const sumWords = paragraphWordCounts.reduce((acc, count) => acc + count, 0);
  const averageWordsPerParagraph = Math.round(sumWords / validParagraphs);

  const evidence = {
    paragraphCount: validParagraphs,
    averageWordsPerParagraph,
    longestParagraphWords: longestWords,
    excessiveParagraphsCount,
    sampleLongestParagraphSnippet: longestSnippet || null,
  };

  if (excessiveParagraphsCount > 0) {
    return {
      checkId: "content_paragraph_structure",
      category: "content",
      name: "Paragraph Structure & Length",
      status: "warning",
      severity: "warning",
      explanation: `Found ${excessiveParagraphsCount} paragraph${excessiveParagraphsCount === 1 ? "" : "s"} with over 200 words (longest has ${longestWords} words). Very long paragraphs create dense text walls that reduce reading comfort.`,
      evidence,
      recommendation: "Break long paragraphs into shorter segments of 40–80 words (2–4 sentences) to enhance reader scannability.",
    };
  }

  if (averageWordsPerParagraph < 10 && validParagraphs >= 6) {
    return {
      checkId: "content_paragraph_structure",
      category: "content",
      name: "Paragraph Structure & Length",
      status: "warning",
      severity: "warning",
      explanation: `Paragraphs are unusually brief (averaging ${averageWordsPerParagraph} words across ${validParagraphs} paragraphs). High fragmentation can lead to choppy reading.`,
      evidence,
      recommendation: "Combine related single-line sentences into cohesive paragraphs where appropriate.",
    };
  }

  return {
    checkId: "content_paragraph_structure",
    category: "content",
    name: "Paragraph Structure & Length",
    status: "pass",
    severity: "none",
    explanation: `Paragraph lengths are well-proportioned for reading comfort (averaging ${averageWordsPerParagraph} words across ${validParagraphs} paragraphs, longest has ${longestWords} words).`,
    evidence,
    recommendation: null,
  };
}
