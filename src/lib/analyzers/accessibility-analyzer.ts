import { BaseAnalyzer } from "./base-analyzer";
import type {
  AccessibilityAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class AccessibilityAnalyzer extends BaseAnalyzer<AccessibilityAnalysisResult> {
  readonly category = "accessibility" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const html = page.html || "";
    const images = page.resources?.images || [];

    // Check 1: HTML Lang Attribute
    totalChecks++;
    const hasHtmlLang = /<html[^>]*lang=["'][^"']+["']/i.test(html);
    if (!hasHtmlLang) {
      issues.push({
        id: "a11y_missing_html_lang",
        category: "accessibility",
        severity: "critical",
        title: "Missing HTML 'lang' Attribute",
        description: "The <html> element does not specify a language, hindering screen reader pronunciation.",
        recommendation: 'Add a lang attribute to the <html> tag, e.g., <html lang="en">.',
        impactScoreDeduction: 15,
        documentationUrl: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
      });
    } else {
      passedChecks++;
    }

    // Check 2: Image Alt Text
    totalChecks++;
    const imagesMissingAlt = images.filter((img) => img.alt === undefined || img.alt === null).length;
    if (imagesMissingAlt > 0) {
      issues.push({
        id: "a11y_images_missing_alt",
        category: "accessibility",
        severity: "critical",
        title: "Images Missing Alternative Text (alt)",
        description: `${imagesMissingAlt} image(s) lack an alt attribute, making them inaccessible to visually impaired users.`,
        recommendation: "Provide informative alt attributes describing image content or alt=\"\" for purely decorative graphics.",
        impactScoreDeduction: 20,
        documentationUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
      });
    } else {
      passedChecks++;
    }

    // Check 3: Empty Anchor Links
    totalChecks++;
    const emptyLinksMatches = html.match(/<a[^>]*href=["'][^"']*["'][^>]*>\s*<\/a>/gi) || [];
    const emptyLinksCount = emptyLinksMatches.length;
    if (emptyLinksCount > 0) {
      issues.push({
        id: "a11y_empty_links",
        category: "accessibility",
        severity: "warning",
        title: "Links Without Discernible Text",
        description: `Found ${emptyLinksCount} link(s) with no discernible text content or aria-label.`,
        recommendation: "Ensure every link includes clear descriptive text, aria-label, or title for assistive devices.",
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 4: Form Input Labels
    totalChecks++;
    const inputMatches = html.match(/<input[^>]*type=["']?(text|email|password|search|tel|url)["']?[^>]*>/gi) || [];
    let inputsMissingLabels = 0;
    for (const inputTag of inputMatches) {
      const hasId = /id=["']([^"']+)["']/i.test(inputTag);
      const hasAriaLabel = /aria-label(?:ledby)?=["'][^"']+["']/i.test(inputTag);
      if (!hasAriaLabel && !hasId) {
        inputsMissingLabels++;
      }
    }

    if (inputsMissingLabels > 0) {
      issues.push({
        id: "a11y_missing_form_labels",
        category: "accessibility",
        severity: "critical",
        title: "Form Inputs Missing Associated Labels",
        description: `${inputsMissingLabels} form field(s) lack explicit labels or aria-label identifiers.`,
        recommendation: "Pair all inputs with <label for=\"id\"> or aria-label attributes.",
        impactScoreDeduction: 15,
      });
    } else {
      passedChecks++;
    }

    metrics["images_missing_alt"] = {
      name: "Images Missing Alt",
      value: imagesMissingAlt,
      unit: "count",
      thresholdGood: 0,
      thresholdPoor: 2,
      actualStatus: imagesMissingAlt === 0 ? "good" : imagesMissingAlt <= 2 ? "needs-improvement" : "poor",
    };

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      auditSummary: {
        imagesMissingAlt,
        emptyLinks: emptyLinksCount,
        contrastIssuesCount: 0,
        missingFormLabels: inputsMissingLabels,
        ariaAttributeErrors: 0,
        htmlLangAttributePresent: hasHtmlLang,
      },
    };
  }
}
