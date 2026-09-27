import { BaseAnalyzer } from "./base-analyzer";
import type {
  SEOAnalysisResult,
  AnalysisIssue,
  MetricMeasurement,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

export class SEOAnalyzer extends BaseAnalyzer<SEOAnalysisResult> {
  readonly category = "seo" as const;

  protected async runAnalysis(page: CrawledPageData) {
    const issues: AnalysisIssue[] = [];
    const metrics: Record<string, MetricMeasurement> = {};
    let passedChecks = 0;
    let totalChecks = 0;

    const html = page.html || "";
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : page.pageTitle || "";
    const titleLength = title.length;

    // Check 1: Page Title Presence & Length
    totalChecks++;
    if (!title) {
      issues.push({
        id: "seo_missing_title",
        category: "seo",
        severity: "critical",
        title: "Missing Page Title",
        description: "The page does not contain a <title> tag, which is essential for search engines.",
        recommendation: "Add a descriptive <title> tag within the <head> section between 30 and 60 characters.",
        impactScoreDeduction: 20,
      });
    } else if (titleLength < 30 || titleLength > 60) {
      issues.push({
        id: "seo_title_length_suboptimal",
        category: "seo",
        severity: "warning",
        title: "Suboptimal Title Length",
        description: `Page title length is ${titleLength} characters. Recommended length is between 30 and 60 characters.`,
        recommendation: "Adjust the page title to ensure full visibility on search engine result pages.",
        codeSnippet: `<title>${title}</title>`,
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    // Check 2: Meta Description
    totalChecks++;
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = descMatch ? descMatch[1].trim() : "";
    const descLength = metaDescription.length;

    if (!metaDescription) {
      issues.push({
        id: "seo_missing_meta_description",
        category: "seo",
        severity: "critical",
        title: "Missing Meta Description",
        description: "Search engines use meta descriptions in snippets beneath your page title.",
        recommendation: "Provide a concise meta description summarizing the page content (between 120 and 160 characters).",
        impactScoreDeduction: 15,
      });
    } else if (descLength < 120 || descLength > 160) {
      issues.push({
        id: "seo_meta_description_length",
        category: "seo",
        severity: "warning",
        title: "Suboptimal Meta Description Length",
        description: `Meta description is ${descLength} characters. Recommended length is 120-160 characters.`,
        recommendation: "Refine the meta description length for optimal display across devices.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    // Check 3: Canonical Link
    totalChecks++;
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
    const hasCanonical = !!canonicalMatch;
    const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : undefined;

    if (!hasCanonical) {
      issues.push({
        id: "seo_missing_canonical",
        category: "seo",
        severity: "warning",
        title: "Missing Canonical Tag",
        description: "No canonical link found. Canonical URLs prevent duplicate content issues.",
        recommendation: `Add <link rel="canonical" href="${page.url}"> to specify the preferred page version.`,
        impactScoreDeduction: 10,
      });
    } else {
      passedChecks++;
    }

    // Check 4: H1 Heading Structure
    totalChecks++;
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
    const h1Count = h1Matches.length;

    if (h1Count === 0) {
      issues.push({
        id: "seo_missing_h1",
        category: "seo",
        severity: "critical",
        title: "Missing H1 Heading",
        description: "Every page should have exactly one main <h1> heading indicating the primary topic.",
        recommendation: "Add a single, descriptive <h1> heading to the page.",
        impactScoreDeduction: 15,
      });
    } else if (h1Count > 1) {
      issues.push({
        id: "seo_multiple_h1",
        category: "seo",
        severity: "warning",
        title: "Multiple H1 Headings Detected",
        description: `Detected ${h1Count} <h1> headings. A single <h1> per page is standard for SEO hierarchy.`,
        recommendation: "Consolidate into one primary <h1> and use <h2>–<h6> for subsequent subsections.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    // Check 5: Open Graph Tags
    totalChecks++;
    const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
    const hasOgDesc = /<meta[^>]*property=["']og:description["']/i.test(html);
    const hasOpenGraphTags = hasOgTitle && hasOgDesc;

    if (!hasOpenGraphTags) {
      issues.push({
        id: "seo_missing_open_graph",
        category: "seo",
        severity: "info",
        title: "Missing Open Graph Social Metadata",
        description: "Open Graph tags enhance snippet previews when the URL is shared on social platforms.",
        recommendation: "Add og:title, og:description, and og:image tags.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    // Check 6: Structured Data (JSON-LD)
    totalChecks++;
    const hasStructuredData = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
    if (!hasStructuredData) {
      issues.push({
        id: "seo_missing_structured_data",
        category: "seo",
        severity: "info",
        title: "No Structured Data (Schema.org / JSON-LD)",
        description: "Structured data enables rich snippets and enhanced search listings.",
        recommendation: "Implement JSON-LD schema markup appropriate for this page type.",
        impactScoreDeduction: 5,
      });
    } else {
      passedChecks++;
    }

    metrics["title_length"] = {
      name: "Title Length",
      value: titleLength,
      unit: "count",
      thresholdGood: 60,
      thresholdPoor: 30,
      actualStatus: titleLength >= 30 && titleLength <= 60 ? "good" : "needs-improvement",
    };

    return {
      passedChecks,
      totalChecks,
      issues,
      metrics,
      metaData: {
        hasTitle: !!title,
        titleLength,
        hasMetaDescription: !!metaDescription,
        metaDescriptionLength: descLength,
        hasCanonical,
        canonicalUrl,
        hasRobotsTag: /<meta[^>]*name=["']robots["']/i.test(html),
        hasOpenGraphTags,
        hasTwitterCards: /<meta[^>]*name=["']twitter:card["']/i.test(html),
        hasStructuredData,
        h1Count,
        headingHierarchyValid: h1Count === 1,
      },
    };
  }
}
