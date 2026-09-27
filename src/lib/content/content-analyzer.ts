/**
 * Deterministic Content Analyzer for SiteLens AI.
 * Inspects real page content for observable lexical, structural, and readability signals.
 * Does not use AI, does not assume business intent, and does not create an overall score.
 */

import type { SinglePageCrawlResult } from "../types/crawler";
import type {
  ContentAnalysisReport,
  ContentCheckResult,
  ContentMetrics,
  ContentSummary,
} from "./types";
import { extractWords, extractSentences } from "./readability";
import { checkVisibleTextAvailability } from "./rules/visible-text-rules";
import { checkHeadingDistribution } from "./rules/heading-distribution-rules";
import { checkContentStructure } from "./rules/content-structure-rules";
import { checkTitleContentAlignment } from "./rules/title-alignment-rules";
import { checkParagraphStructure } from "./rules/paragraph-structure-rules";
import { checkExcessiveRepetition } from "./rules/repetition-rules";
import { checkThinContent } from "./rules/thin-content-rules";
import { checkImageTextBalance } from "./rules/image-text-balance-rules";
import { checkCallsToAction } from "./rules/call-to-action-rules";
import { checkReadability } from "./rules/readability-rules";

export const CONTENT_AUDIT_DISCLAIMER =
  "Deterministic content analysis measures observable structural, lexical, and statistical properties of the extracted page text. SiteLens does not infer subjective business objectives, brand voice, or marketing conversion intent.";

export class DeterministicContentAnalyzer {
  /**
   * Analyzes extracted page content deterministically without LLMs or fake metrics.
   */
  analyze(crawlResult: SinglePageCrawlResult): ContentAnalysisReport {
    const startTime = Date.now();
    const checks: ContentCheckResult[] = [];

    const textContent = crawlResult.textContent || "";
    const html = crawlResult.html || "";
    const pageTitle = crawlResult.pageTitle;
    const language = crawlResult.language;
    const images = crawlResult.images || [];
    const headings = crawlResult.headings;

    const words = extractWords(textContent);
    const sentences = extractSentences(textContent);
    const wordCount = words.length;
    const characterCount = textContent.replace(/\s+/g, " ").trim().length;
    const sentenceCount = sentences.length;

    // 1. Visible Text Availability
    checks.push(checkVisibleTextAvailability(textContent));

    // 2. Heading Distribution
    checks.push(checkHeadingDistribution(headings, wordCount));

    // 3. Semantic Content Structure
    checks.push(checkContentStructure(html, wordCount));

    // 4. Title / Content Alignment
    checks.push(checkTitleContentAlignment(pageTitle, textContent));

    // 5. Paragraph Structure
    checks.push(checkParagraphStructure(html, wordCount));

    // 6. Excessive Repetition / Keyword Stuffing
    checks.push(checkExcessiveRepetition(textContent));

    // 7. Thin-Content Signals
    checks.push(checkThinContent(textContent, html));

    // 8. Image / Text Balance
    checks.push(checkImageTextBalance(images.length, wordCount));

    // 9. Calls-to-Action
    const { checkResult: ctaCheck, detectedCtas } = checkCallsToAction(html);
    checks.push(ctaCheck);

    // 10. Readability Indicators
    const { checkResult: readabilityCheck, readabilityMetrics } = checkReadability(
      textContent,
      language
    );
    checks.push(readabilityCheck);

    // Calculate Summary tallies
    let passedCount = 0;
    let warningCount = 0;
    let failedCount = 0;
    let notCheckedCount = 0;

    for (const check of checks) {
      if (check.status === "pass") passedCount++;
      else if (check.status === "warning") warningCount++;
      else if (check.status === "fail") failedCount++;
      else if (check.status === "not_checked") notCheckedCount++;
    }

    const summary: ContentSummary = {
      totalChecks: checks.length,
      passedCount,
      warningCount,
      failedCount,
      notCheckedCount,
    };

    // Calculate Content Metrics
    const textBytes = Buffer.byteLength(textContent, "utf8");
    const htmlBytes = Buffer.byteLength(html, "utf8");
    const textToHtmlRatioPercent =
      htmlBytes > 0 ? Math.round((textBytes / htmlBytes) * 1000) / 10 : 0;

    const totalHeadings = headings?.all?.length || 0;
    const wordsPerHeading = totalHeadings > 0 ? Math.round(wordCount / totalHeadings) : null;
    const wordsPerImage = images.length > 0 ? Math.round(wordCount / images.length) : null;

    // Approximate reading time at 220 words per minute
    const readingTimeMinutes =
      wordCount > 0 ? Math.max(0.5, Math.round((wordCount / 220) * 10) / 10) : 0;

    // Count paragraphs in HTML
    const paragraphCount = (html.match(/<p\b[^>]*>/gi) || []).length;

    const metrics: ContentMetrics = {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      headingCount: totalHeadings,
      readingTimeMinutes,
      textToHtmlRatioPercent,
      readability: readabilityMetrics,
      contentBalance: {
        imageCount: images.length,
        wordsPerImage,
        wordsPerHeading,
      },
      callToActionSummary: {
        detectedCtaCount: detectedCtas.length,
        ctas: detectedCtas,
      },
    };

    const durationMs = Date.now() - startTime;

    return {
      targetUrl: crawlResult.finalUrl || crawlResult.requestedUrl,
      analyzedAt: new Date().toISOString(),
      durationMs,
      disclaimer: CONTENT_AUDIT_DISCLAIMER,
      summary,
      metrics,
      checks,
    };
  }
}

export const defaultDeterministicContentAnalyzer = new DeterministicContentAnalyzer();
