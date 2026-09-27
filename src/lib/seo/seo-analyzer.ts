import type { SinglePageCrawlResult } from "../types/crawler";
import type { SEOAnalysisReport, SEOCheckResult, SEOSummary } from "./types";
import { checkTitlePresence, checkTitleLength } from "./rules/title-rules";
import {
  checkMetaDescriptionPresence,
  checkMetaDescriptionLength,
} from "./rules/meta-description-rules";
import { checkCanonicalUrl } from "./rules/canonical-rules";
import { checkRobotsDirectives } from "./rules/robots-rules";
import { checkH1Presence, checkHeadingHierarchy } from "./rules/heading-rules";
import { checkImageAltAttributes } from "./rules/image-alt-rules";
import { checkInternalLinks, checkExternalLinks } from "./rules/links-rules";
import { checkUrlStructure } from "./rules/url-structure-rules";
import { checkLanguageDeclaration } from "./rules/language-rules";
import { checkViewportConfiguration } from "./rules/viewport-rules";
import { checkOpenGraphMetadata } from "./rules/open-graph-rules";
import { checkStructuredData } from "./rules/structured-data-rules";
import { checkIndexabilitySignals } from "./rules/indexability-rules";

export class DeterministicSEOAnalyzer {
  /**
   * Analyzes real crawler output for measurable SEO factors using deterministic rules.
   * Produces structured data distinguishing between pass, warning, fail, and not_checked.
   * Does NOT generate an overall score or invoke AI.
   */
  analyze(crawlResult: SinglePageCrawlResult): SEOAnalysisReport {
    const checks: SEOCheckResult[] = [];

    // 1 & 2: Title presence and length
    checks.push(checkTitlePresence(crawlResult.pageTitle));
    checks.push(checkTitleLength(crawlResult.pageTitle));

    // 3 & 4: Meta description presence and length
    checks.push(checkMetaDescriptionPresence(crawlResult.metaDescription));
    checks.push(checkMetaDescriptionLength(crawlResult.metaDescription));

    // 5: Canonical URL tag
    checks.push(
      checkCanonicalUrl(crawlResult.canonicalUrl, crawlResult.finalUrl)
    );

    // 6: Robots directives
    checks.push(checkRobotsDirectives(crawlResult.robots));

    // 7: H1 presence
    checks.push(checkH1Presence(crawlResult.headings.h1));

    // 8: Heading hierarchy
    checks.push(checkHeadingHierarchy(crawlResult.headings));

    // 9: Image alt attributes
    checks.push(checkImageAltAttributes(crawlResult.images));

    // 10: Internal links
    checks.push(checkInternalLinks(crawlResult.links));

    // 11: External links
    checks.push(checkExternalLinks(crawlResult.links));

    // 12: URL structure
    checks.push(checkUrlStructure(crawlResult.finalUrl));

    // 13: Language declaration
    checks.push(checkLanguageDeclaration(crawlResult.language));

    // 14: Viewport configuration
    checks.push(checkViewportConfiguration(crawlResult.viewport));

    // 15: Open Graph metadata
    checks.push(checkOpenGraphMetadata(crawlResult.openGraph));

    // 16: Structured data
    checks.push(checkStructuredData(crawlResult.structuredData));

    // 17: Indexability signals
    const indexability = checkIndexabilitySignals(
      crawlResult.finalUrl,
      crawlResult.httpStatus,
      crawlResult.robots,
      crawlResult.headers
    );
    checks.push(indexability.checkResult);

    // Calculate Summary Counts
    let passedCount = 0;
    let warningCount = 0;
    let failedCount = 0;
    let notCheckedCount = 0;

    for (const c of checks) {
      if (c.status === "pass") passedCount++;
      else if (c.status === "warning") warningCount++;
      else if (c.status === "fail") failedCount++;
      else if (c.status === "not_checked") notCheckedCount++;
    }

    const summary: SEOSummary = {
      totalChecks: checks.length,
      passedCount,
      warningCount,
      failedCount,
      notCheckedCount,
    };

    return {
      targetUrl: crawlResult.requestedUrl,
      finalUrl: crawlResult.finalUrl,
      analyzedAt: new Date().toISOString(),
      isIndexable: indexability.isIndexable,
      summary,
      checks,
    };
  }
}

export const defaultDeterministicSEOAnalyzer = new DeterministicSEOAnalyzer();
