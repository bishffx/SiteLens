import { BaseAnalyzer } from "./base-analyzer";
import type {
  UXAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class UXAnalyzer extends BaseAnalyzer<UXAnalysisResult> {
  readonly category = "ux" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const html = page.html || "";

    // Check 1: Favicon Presence
    totalChecks++;
    const hasFavicon = /<link[^>]*rel=["'](?:shortcut )?icon["']/i.test(html);
    if (!hasFavicon) {
      issues.push({
        id: "ux_missing_favicon",
        category: "ux",
        severity: "warning",
        title: "Missing Favicon Reference",
        description: "No favicon declaration was found in the HTML head. Favicons establish brand trust in browser tabs.",
        recommendation: 'Add a standard <link rel="icon" href="/favicon.ico"> tag in <head>.',
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 2: Call to Action (CTA) Presence
    totalChecks++;
    const hasCta =
      /<button[^>]*>.*?<\/button>/i.test(html) ||
      /<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["']/i.test(html);

    if (!hasCta) {
      issues.push({
        id: "ux_missing_clear_cta",
        category: "ux",
        severity: "info",
        title: "No Prominent Call-to-Action (CTA) Identified",
        description: "The page does not appear to feature clear buttons or CTA link styling.",
        recommendation: "Guide visitor intent with prominent, visually distinct action buttons.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    // Check 3: Broken Anchor Links or javascript:void(0) Anti-patterns
    totalChecks++;
    const javascriptVoidMatches = html.match(/href=["']javascript:(?:void\(0\)|;)["']/gi) || [];
    if (javascriptVoidMatches.length > 0) {
      issues.push({
        id: "ux_javascript_void_links",
        category: "ux",
        severity: "warning",
        title: "Misused 'javascript:void(0)' Anchor Links",
        description: `Found ${javascriptVoidMatches.length} link(s) using 'javascript:void(0)'. Anchors should lead to URLs; use <button> for JS interactions.`,
        recommendation: "Replace fake links with semantic <button type=\"button\"> elements.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    metrics["favicon_present"] = {
      name: "Favicon Present",
      value: hasFavicon ? 1 : 0,
      unit: "count",
      thresholdGood: 1,
      thresholdPoor: 0,
      actualStatus: hasFavicon ? "good" : "poor",
    };

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      uxMetrics: {
        brokenLinksCount: 0,
        hasFavicon,
        hasCustom404Detected: false,
        visualClutterRatio: undefined,
        hasClearCallToAction: hasCta,
      },
    };
  }
}
