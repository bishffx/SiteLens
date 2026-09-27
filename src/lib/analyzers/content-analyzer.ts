import { BaseAnalyzer } from "./base-analyzer";
import type {
  ContentAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class ContentAnalyzer extends BaseAnalyzer<ContentAnalysisResult> {
  readonly category = "content" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const textContent = page.textContent || "";
    const html = page.html || "";

    const words = textContent
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

    const htmlBytes = Buffer.byteLength(html, "utf8");
    const textBytes = Buffer.byteLength(textContent, "utf8");
    const textToHtmlRatio = htmlBytes > 0 ? textBytes / htmlBytes : 0;

    // Check 1: Thin Content Detection
    totalChecks++;
    if (wordCount < 100) {
      issues.push({
        id: "content_thin_content",
        category: "content",
        severity: "critical",
        title: "Thin Content Detected",
        description: `Page contains only ${wordCount} words. Thin pages risk penalty under search engine quality algorithms.`,
        recommendation: "Expand the page content with in-depth, valuable information relevant to user intent.",
        impactScoreDeduction: 25,
      });
    } else if (wordCount < 300) {
      issues.push({
        id: "content_short_length",
        category: "content",
        severity: "warning",
        title: "Relatively Low Word Count",
        description: `Word count is ${wordCount}. Standard long-form articles or landing pages typically benefit from 300+ words.`,
        recommendation: "Consider adding supportive context, FAQs, or detailed explanations.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 2: Text to HTML Ratio
    totalChecks++;
    metrics["text_html_ratio"] = {
      name: "Text to HTML Ratio",
      value: Math.round(textToHtmlRatio * 100) / 100,
      unit: "ratio",
      thresholdGood: 0.15,
      thresholdPoor: 0.05,
      actualStatus: textToHtmlRatio >= 0.15 ? "good" : textToHtmlRatio >= 0.05 ? "needs-improvement" : "poor",
    };

    if (textToHtmlRatio < 0.05 && wordCount > 0) {
      issues.push({
        id: "content_low_text_ratio",
        category: "content",
        severity: "warning",
        title: "Low Text-to-HTML Ratio",
        description: `Text comprises only ${Math.round(textToHtmlRatio * 100)}% of the total markup size.`,
        recommendation: "Clean up bloated DOM structure, inline scripts, or inline CSS to favor actual text content.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      contentMetrics: {
        wordCount,
        readingTimeMinutes,
        readabilityScore: undefined,
        textToHtmlRatio,
        duplicateContentDetected: false,
      },
    };
  }
}
