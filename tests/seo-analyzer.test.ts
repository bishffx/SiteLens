import { describe, it } from "node:test";
import assert from "node:assert";
import {
  checkTitlePresence,
  checkTitleLength,
} from "../src/lib/seo/rules/title-rules";
import {
  checkMetaDescriptionPresence,
  checkMetaDescriptionLength,
} from "../src/lib/seo/rules/meta-description-rules";
import { checkCanonicalUrl } from "../src/lib/seo/rules/canonical-rules";
import { checkRobotsDirectives } from "../src/lib/seo/rules/robots-rules";
import {
  checkH1Presence,
  checkHeadingHierarchy,
} from "../src/lib/seo/rules/heading-rules";
import { checkImageAltAttributes } from "../src/lib/seo/rules/image-alt-rules";
import {
  checkInternalLinks,
  checkExternalLinks,
} from "../src/lib/seo/rules/links-rules";
import { checkUrlStructure } from "../src/lib/seo/rules/url-structure-rules";
import { checkLanguageDeclaration } from "../src/lib/seo/rules/language-rules";
import { checkViewportConfiguration } from "../src/lib/seo/rules/viewport-rules";
import { checkOpenGraphMetadata } from "../src/lib/seo/rules/open-graph-rules";
import { checkStructuredData } from "../src/lib/seo/rules/structured-data-rules";
import { checkIndexabilitySignals } from "../src/lib/seo/rules/indexability-rules";
import { DeterministicSEOAnalyzer } from "../src/lib/seo/seo-analyzer";
import type { SinglePageCrawlResult } from "../src/lib/types/crawler";

describe("Deterministic SEO Analyzer - Unit Rules", () => {
  describe("Title Rules", () => {
    it("should fail when title is missing or empty", () => {
      const nullTitle = checkTitlePresence(null);
      assert.strictEqual(nullTitle.status, "fail");
      assert.strictEqual(nullTitle.severity, "critical");

      const emptyTitle = checkTitlePresence("   ");
      assert.strictEqual(emptyTitle.status, "fail");
    });

    it("should pass when title is present", () => {
      const res = checkTitlePresence("SiteLens - Modern Website Audit Tool");
      assert.strictEqual(res.status, "pass");
      assert.strictEqual(res.severity, "none");
    });

    it("should validate title length boundaries correctly", () => {
      // Missing returns not_checked because length is not evaluable without title
      assert.strictEqual(checkTitleLength(null).status, "not_checked");

      // Too short (< 30)
      const short = checkTitleLength("Short Title");
      assert.strictEqual(short.status, "warning");
      assert.strictEqual(short.severity, "warning");

      // Optimal (30 - 60)
      const optimal = checkTitleLength("SiteLens - Fast Developer Focused Audits");
      assert.strictEqual(optimal.status, "pass");
      assert.strictEqual(optimal.severity, "none");

      // Too long (> 60)
      const longTitle = "A".repeat(65);
      const longRes = checkTitleLength(longTitle);
      assert.strictEqual(longRes.status, "warning");
    });
  });

  describe("Meta Description Rules", () => {
    it("should fail when meta description is missing", () => {
      const res = checkMetaDescriptionPresence(null);
      assert.strictEqual(res.status, "fail");
      assert.strictEqual(res.severity, "critical");
    });

    it("should pass when meta description is present", () => {
      const res = checkMetaDescriptionPresence("A valid meta description for testing.");
      assert.strictEqual(res.status, "pass");
    });

    it("should validate meta description length boundaries", () => {
      // Missing returns not_checked because length is not evaluable without description
      assert.strictEqual(checkMetaDescriptionLength(null).status, "not_checked");

      const shortDesc = checkMetaDescriptionLength("Too short description.");
      assert.strictEqual(shortDesc.status, "warning");

      const optimalText = "A".repeat(140);
      const optimal = checkMetaDescriptionLength(optimalText);
      assert.strictEqual(optimal.status, "pass");

      const longDesc = checkMetaDescriptionLength("A".repeat(170));
      assert.strictEqual(longDesc.status, "warning");
    });
  });

  describe("Canonical URL Rules", () => {
    it("should warn when canonical URL is missing", () => {
      const res = checkCanonicalUrl(null, "https://example.com/test");
      assert.strictEqual(res.status, "warning");
    });

    it("should pass when canonical URL matches final URL", () => {
      const res = checkCanonicalUrl("https://example.com/test", "https://example.com/test");
      assert.strictEqual(res.status, "pass");
    });

    it("should pass when declaring an absolute canonical URL", () => {
      const res = checkCanonicalUrl("https://example.com/canonical", "https://example.com/original");
      assert.strictEqual(res.status, "pass");
    });

    it("should fail when canonical is invalid", () => {
      const res = checkCanonicalUrl("ftp://invalid-url", "https://example.com");
      assert.strictEqual(res.status, "fail");
    });
  });

  describe("Robots Directives Rules", () => {
    it("should warn when noindex directive is detected", () => {
      const res = checkRobotsDirectives("noindex, follow");
      assert.strictEqual(res.status, "warning");
      assert.strictEqual(res.severity, "warning");
    });

    it("should pass when indexable directives are specified or absent", () => {
      const res = checkRobotsDirectives(null);
      assert.strictEqual(res.status, "pass");

      const resIndex = checkRobotsDirectives("index, follow");
      assert.strictEqual(resIndex.status, "pass");
    });
  });

  describe("Heading Rules", () => {
    it("should fail if no H1 is present", () => {
      const res = checkH1Presence([]);
      assert.strictEqual(res.status, "fail");
    });

    it("should pass if exactly one H1 is present", () => {
      const res = checkH1Presence(["Main Heading"]);
      assert.strictEqual(res.status, "pass");
    });

    it("should warn if multiple H1s are present", () => {
      const res = checkH1Presence(["Heading 1", "Heading 2"]);
      assert.strictEqual(res.status, "warning");
    });

    it("should detect skipped heading levels in hierarchy", () => {
      // H1 followed by H3 (skipping H2)
      const hierarchy = checkHeadingHierarchy({
        all: [
          { level: "h1", text: "Main Title" },
          { level: "h3", text: "Sub-sub section" },
        ],
      });
      assert.strictEqual(hierarchy.status, "warning");
      assert.strictEqual(hierarchy.severity, "warning");

      // Sequential hierarchy: H1 and H2
      const goodHierarchy = checkHeadingHierarchy({
        all: [
          { level: "h1", text: "Main Title" },
          { level: "h2", text: "Sub section" },
        ],
      });
      assert.strictEqual(goodHierarchy.status, "pass");
    });
  });

  describe("Image Alt Rules", () => {
    it("should return not_checked if page has zero images", () => {
      const res = checkImageAltAttributes([]);
      assert.strictEqual(res.status, "not_checked");
      assert.strictEqual(res.severity, "none");
    });

    it("should pass when all images have alt text", () => {
      const res = checkImageAltAttributes([
        { src: "/hero.jpg", alt: "Hero image", loading: null, width: null, height: null },
        { src: "/logo.png", alt: "Company Logo", loading: null, width: null, height: null },
      ]);
      assert.strictEqual(res.status, "pass");
    });

    it("should warn when 1-3 images are missing alt text", () => {
      const res = checkImageAltAttributes([
        { src: "/hero.jpg", alt: null, loading: null, width: null, height: null },
        { src: "/logo.png", alt: "Company Logo", loading: null, width: null, height: null },
      ]);
      assert.strictEqual(res.status, "warning");
      assert.strictEqual(res.severity, "warning");
    });

    it("should fail when more than 3 images are missing alt text", () => {
      const res = checkImageAltAttributes([
        { src: "/img1.jpg", alt: null, loading: null, width: null, height: null },
        { src: "/img2.jpg", alt: null, loading: null, width: null, height: null },
        { src: "/img3.jpg", alt: null, loading: null, width: null, height: null },
        { src: "/img4.jpg", alt: null, loading: null, width: null, height: null },
      ]);
      assert.strictEqual(res.status, "fail");
      assert.strictEqual(res.severity, "critical");
    });
  });

  describe("Links Rules", () => {
    it("should warn if no internal links are found", () => {
      const res = checkInternalLinks([]);
      assert.strictEqual(res.status, "warning");
    });

    it("should pass when internal links exist and have anchor text", () => {
      const res = checkInternalLinks([
        { href: "/about", text: "About Us", isInternal: true, rel: null, target: null },
      ]);
      assert.strictEqual(res.status, "pass");
    });

    it("should return not_checked for external links if page has none", () => {
      const res = checkExternalLinks([]);
      assert.strictEqual(res.status, "not_checked");
    });

    it("should warn if external links target=_blank without rel=noopener", () => {
      const res = checkExternalLinks([
        { href: "https://external.org", text: "External Link", isInternal: false, target: "_blank", rel: null },
      ]);
      assert.strictEqual(res.status, "warning");
    });
  });

  describe("URL Structure Rules", () => {
    it("should pass for clean, concise lowercase URL", () => {
      const res = checkUrlStructure("https://example.com/blog/seo-checklist");
      assert.strictEqual(res.status, "pass");
    });

    it("should warn on uppercase characters or excessive query params", () => {
      const uppercase = checkUrlStructure("https://example.com/Blog/Seo");
      assert.strictEqual(uppercase.status, "warning");

      const queries = checkUrlStructure("https://example.com/search?a=1&b=2&c=3&d=4");
      assert.strictEqual(queries.status, "warning");
    });
  });

  describe("Language Rules", () => {
    it("should fail when lang attribute is missing", () => {
      const res = checkLanguageDeclaration(null);
      assert.strictEqual(res.status, "fail");
    });

    it("should pass with standard BCP 47 language code", () => {
      const res = checkLanguageDeclaration("en-US");
      assert.strictEqual(res.status, "pass");
    });
  });

  describe("Viewport Rules", () => {
    it("should fail when viewport meta tag is missing", () => {
      const res = checkViewportConfiguration(null);
      assert.strictEqual(res.status, "fail");
      assert.strictEqual(res.severity, "critical");
    });

    it("should pass with responsive viewport configuration", () => {
      const res = checkViewportConfiguration("width=device-width, initial-scale=1");
      assert.strictEqual(res.status, "pass");
    });
  });

  describe("Open Graph & Structured Data Rules", () => {
    it("should warn if essential Open Graph tags are missing", () => {
      const res = checkOpenGraphMetadata({});
      assert.strictEqual(res.status, "warning");
    });

    it("should pass when OG title, description, and image are present", () => {
      const res = checkOpenGraphMetadata({
        title: "Test Title",
        description: "Test Description",
        image: "https://example.com/og.png",
      });
      assert.strictEqual(res.status, "pass");
    });

    it("should warn if no structured data (JSON-LD) is found", () => {
      const res = checkStructuredData([]);
      assert.strictEqual(res.status, "warning");
    });

    it("should pass when structured data is valid JSON-LD", () => {
      const res = checkStructuredData([
        {
          type: "Organization",
          rawJson: '{"@context":"https://schema.org","@type":"Organization","name":"SiteLens"}',
          parsed: { "@type": "Organization", name: "SiteLens" },
          isValidJson: true,
        },
      ]);
      assert.strictEqual(res.status, "pass");
    });
  });

  describe("Indexability Signals Rules", () => {
    it("should fail if HTTP status is non-200", () => {
      const res = checkIndexabilitySignals("https://example.com/404", 404, null, {});
      assert.strictEqual(res.isIndexable, false);
      assert.strictEqual(res.checkResult.status, "fail");
      assert.strictEqual(res.checkResult.severity, "critical");
    });

    it("should warn if page is served over plain HTTP", () => {
      const res = checkIndexabilitySignals("http://example.com", 200, null, {});
      assert.strictEqual(res.isIndexable, true);
      assert.strictEqual(res.checkResult.status, "warning");
    });

    it("should pass when HTTPS, HTTP 200, and no blocking directives", () => {
      const res = checkIndexabilitySignals("https://example.com", 200, "index, follow", {});
      assert.strictEqual(res.isIndexable, true);
      assert.strictEqual(res.checkResult.status, "pass");
      assert.strictEqual(res.checkResult.severity, "none");
    });
  });
});

describe("Deterministic SEO Analyzer - Full Crawl Integration", () => {
  it("should run all 17 checks and compute accurate summary tallies without scoring", () => {
    const analyzer = new DeterministicSEOAnalyzer();

    const mockCrawlResult: SinglePageCrawlResult = {
      requestedUrl: "https://sitelens.dev",
      finalUrl: "https://sitelens.dev/",
      httpStatus: 200,
      statusText: "OK",
      pageTitle: "SiteLens - Autonomous Website Quality Auditing Platform",
      metaDescription: "SiteLens delivers deep, deterministic audits for SEO, accessibility, mobile usability, and performance with actionable recommendations.",
      canonicalUrl: "https://sitelens.dev/",
      robots: {
        metaRobots: "index, follow",
        directives: ["index", "follow"],
      },
      viewport: {
        metaViewport: "width=device-width, initial-scale=1.0",
        hasWidthDeviceWidth: true,
        hasInitialScale: true,
        userScalableDisabled: false,
      },
      language: "en",
      headings: {
        h1: ["SiteLens AI Platform"],
        h2: ["Deterministic Analysis", "Actionable Guidance"],
        h3: ["SEO Checks", "Performance Benchmarks"],
        h4: [],
        h5: [],
        h6: [],
        all: [
          { level: "h1", text: "SiteLens AI Platform" },
          { level: "h2", text: "Deterministic Analysis" },
          { level: "h2", text: "Actionable Guidance" },
          { level: "h3", text: "SEO Checks" },
          { level: "h3", text: "Performance Benchmarks" },
        ],
      },
      links: [
        { href: "/features", text: "Features", isInternal: true, rel: null, target: null },
        { href: "/pricing", text: "Pricing", isInternal: true, rel: null, target: null },
        { href: "https://github.com", text: "GitHub", isInternal: false, rel: "noopener noreferrer", target: "_blank" },
      ],
      images: [
        { src: "/logo.svg", alt: "SiteLens Logo", loading: null, width: null, height: null },
        { src: "/screenshot.png", alt: "Dashboard Screenshot", loading: null, width: null, height: null },
      ],
      openGraph: {
        "og:title": "SiteLens",
        "og:description": "Autonomous Website Quality Auditing",
        "og:image": "https://sitelens.dev/og.png",
      },
      twitter: {
        card: "summary_large_image",
        title: "SiteLens",
      },
      structuredData: [
        {
          type: "SoftwareApplication",
          rawJson: '{"@context":"https://schema.org","@type":"SoftwareApplication"}',
          parsed: { "@type": "SoftwareApplication" },
          isValidJson: true,
        },
      ],
      textContent: "SiteLens delivers deep, deterministic audits...",
      html: "<html>...</html>",
      resources: {
        scripts: [],
        stylesheets: [],
        totalScriptsCount: 0,
        totalStylesheetsCount: 0,
        totalImagesCount: 2,
      },
      timing: {
        dnsLookupMs: 10,
        tcpConnectMs: 20,
        tlsHandshakeMs: 30,
        timeToFirstByteMs: 50,
        domContentLoadedMs: 200,
        loadCompleteMs: 400,
      },
      redirectChain: [],
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      isJavaScriptRendered: true,
      capturedAt: new Date().toISOString(),
      errors: [],
    };

    const report = analyzer.analyze(mockCrawlResult);

    // Verify report structure
    assert.strictEqual(report.targetUrl, "https://sitelens.dev");
    assert.strictEqual(report.finalUrl, "https://sitelens.dev/");
    assert.strictEqual(report.isIndexable, true);
    assert.strictEqual(report.summary.totalChecks, 17);
    assert.strictEqual(report.checks.length, 17);

    // Verify all check objects contain required structured fields
    for (const check of report.checks) {
      assert.ok(check.checkId, "Missing checkId");
      assert.ok(check.category === "seo", "Invalid category");
      assert.ok(
        ["pass", "warning", "fail", "not_checked"].includes(check.status),
        `Invalid status: ${check.status}`
      );
      assert.ok(
        ["critical", "warning", "info", "none"].includes(check.severity),
        `Invalid severity: ${check.severity}`
      );
      assert.ok(typeof check.explanation === "string", "Missing explanation");
      assert.ok(check.evidence !== undefined, "Missing evidence");
    }

    // Verify summary counts tally mathematically
    const { passedCount, warningCount, failedCount, notCheckedCount, totalChecks } = report.summary;
    assert.strictEqual(
      passedCount + warningCount + failedCount + notCheckedCount,
      totalChecks,
      "Tally must equal totalChecks"
    );

    // On this clean mock page, all checks should pass
    assert.strictEqual(passedCount, 17);
    assert.strictEqual(warningCount, 0);
    assert.strictEqual(failedCount, 0);
    assert.strictEqual(notCheckedCount, 0);

    // Verify that NO overall score property exists on report
    assert.strictEqual((report as unknown as Record<string, unknown>).score, undefined);
    assert.strictEqual((report as unknown as Record<string, unknown>).overallScore, undefined);
  });
});
