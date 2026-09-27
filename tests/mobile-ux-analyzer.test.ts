import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  checkViewportMeta,
  checkHorizontalOverflow,
  checkResponsiveLayoutBehavior,
  checkTapTargets,
  checkMobileLegibility,
  checkMobileNavigation,
  checkInteractionIntegrity,
  checkLoadingUsability,
  checkLayoutStability,
  generateManualReviewFindings,
  DeterministicMobileUXAnalyzer,
  MOBILE_UX_DISCLAIMER,
  evaluateStaticHtml,
} from "../src/lib/mobile-ux";
import type { SinglePageCrawlResult } from "../src/lib/types/crawler";
import type { BrowserMeasuredData } from "../src/lib/mobile-ux/dom-evaluator";

describe("SiteLens Mobile & UX Analyzer - Unit Rules", () => {
  describe("Viewport Configuration (Heuristic)", () => {
    test("should fail critically when viewport meta tag is missing", () => {
      const finding = checkViewportMeta(null);
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
    });

    test("should warn when user-scalable is disabled", () => {
      const finding = checkViewportMeta({
        metaViewport: "width=device-width, initial-scale=1.0, user-scalable=no",
        hasWidthDeviceWidth: true,
        hasInitialScale: true,
        userScalableDisabled: true,
      });
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "warning");
      assert.equal(finding.severity, "warning");
    });

    test("should pass when responsive viewport is fully configured", () => {
      const finding = checkViewportMeta({
        metaViewport: "width=device-width, initial-scale=1.0",
        hasWidthDeviceWidth: true,
        hasInitialScale: true,
        userScalableDisabled: false,
      });
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "pass");
      assert.equal(finding.severity, "none");
    });
  });

  describe("Horizontal Overflow (Measured)", () => {
    test("should fail critically when horizontal overflow exceeds 20px on mobile", () => {
      const mockData: BrowserMeasuredData = {
        viewportWidth: 375,
        viewportHeight: 667,
        scrollWidth: 440,
        scrollHeight: 1000,
        hasHorizontalOverflow: true,
        horizontalOverflowPx: 65,
        overflowingElements: [
          {
            selector: "div.wide-table",
            tagName: "div",
            right: 440,
            width: 440,
            overflowPx: 65,
            htmlSnippet: "<div class='wide-table'>...</div>",
          },
        ],
        tapTargets: { totalEvaluated: 5, undersizedCount: 0, crowdedCount: 0, sampleUndersized: [] },
        typography: { minimumFontSizePx: 16, smallFontElementsCount: 0, sampleSmallFonts: [] },
        layoutStability: { imagesWithoutDimensionsCount: 0, sampleMissingDimensions: [] },
        navigation: { hasNavLandmark: true, hasMobileToggle: true, navElementsCount: 1 },
        interactionIntegrity: { brokenHrefsCount: 0, formsMissingSubmitCount: 0, sampleBrokenControls: [] },
      };

      const finding = checkHorizontalOverflow(mockData);
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
      assert.equal((finding.evidence as { overflowPx: number }).overflowPx, 65);
    });

    test("should pass when scrollWidth matches mobile viewport width", () => {
      const mockData: BrowserMeasuredData = {
        viewportWidth: 375,
        viewportHeight: 667,
        scrollWidth: 375,
        scrollHeight: 1000,
        hasHorizontalOverflow: false,
        horizontalOverflowPx: 0,
        overflowingElements: [],
        tapTargets: { totalEvaluated: 5, undersizedCount: 0, crowdedCount: 0, sampleUndersized: [] },
        typography: { minimumFontSizePx: 16, smallFontElementsCount: 0, sampleSmallFonts: [] },
        layoutStability: { imagesWithoutDimensionsCount: 0, sampleMissingDimensions: [] },
        navigation: { hasNavLandmark: true, hasMobileToggle: true, navElementsCount: 1 },
        interactionIntegrity: { brokenHrefsCount: 0, formsMissingSubmitCount: 0, sampleBrokenControls: [] },
      };

      const finding = checkHorizontalOverflow(mockData);
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
      assert.equal(finding.severity, "none");
    });
  });

  describe("Responsive Multi-Viewport Layout Adaptation (Measured)", () => {
    test("should fail when both mobile and tablet trigger overflow", () => {
      const finding = checkResponsiveLayoutBehavior(true, true);
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
    });

    test("should warn when only one viewport triggers overflow", () => {
      const finding = checkResponsiveLayoutBehavior(true, false);
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "warning");
    });

    test("should pass when all viewports adapt fluidly", () => {
      const finding = checkResponsiveLayoutBehavior(false, false);
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
    });
  });

  describe("Tap Target Sizing & Proximity (Measured)", () => {
    test("should fail critically when targets are smaller than 24x24px", () => {
      const finding = checkTapTargets({
        totalEvaluated: 10,
        undersizedCount: 2,
        crowdedCount: 0,
        sampleUndersized: [
          { selector: "a.icon", tagName: "a", text: "x", width: 16, height: 16 },
        ],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
    });

    test("should warn when targets are between 24px and 44px or crowded", () => {
      const finding = checkTapTargets({
        totalEvaluated: 10,
        undersizedCount: 2,
        crowdedCount: 1,
        sampleUndersized: [
          { selector: "button.chip", tagName: "button", text: "Filter", width: 36, height: 32 },
        ],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "warning");
      assert.equal(finding.severity, "warning");
    });

    test("should pass when targets meet 44x44px standards", () => {
      const finding = checkTapTargets({
        totalEvaluated: 8,
        undersizedCount: 0,
        crowdedCount: 0,
        sampleUndersized: [],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
      assert.equal(finding.severity, "none");
    });
  });

  describe("Mobile Content Font Legibility (Measured)", () => {
    test("should fail critically when minimum font size is below 10px", () => {
      const finding = checkMobileLegibility({
        minimumFontSizePx: 8.5,
        smallFontElementsCount: 3,
        sampleSmallFonts: [{ selector: "span.legal", fontSizePx: 8.5, text: "terms" }],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
    });

    test("should warn when font size is between 10px and 12px", () => {
      const finding = checkMobileLegibility({
        minimumFontSizePx: 11,
        smallFontElementsCount: 2,
        sampleSmallFonts: [{ selector: "p.disclaimer", fontSizePx: 11, text: "note" }],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "warning");
    });

    test("should pass when all visible text is at least 12px", () => {
      const finding = checkMobileLegibility({
        minimumFontSizePx: 14,
        smallFontElementsCount: 0,
        sampleSmallFonts: [],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
    });
  });

  describe("Mobile Navigation Accessibility (Heuristic)", () => {
    test("should warn when both nav landmark and toggle are missing", () => {
      const finding = checkMobileNavigation({
        hasNavLandmark: false,
        hasMobileToggle: false,
        navElementsCount: 0,
      });
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "warning");
    });

    test("should warn when mobile toggle lacks aria-expanded attribute", () => {
      const finding = checkMobileNavigation({
        hasNavLandmark: true,
        hasMobileToggle: true,
        navElementsCount: 1,
        toggleDetails: { selector: "button.hamburger", hasAriaExpanded: false },
      });
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "warning");
    });

    test("should pass when nav landmark and accessible toggle exist", () => {
      const finding = checkMobileNavigation({
        hasNavLandmark: true,
        hasMobileToggle: true,
        navElementsCount: 1,
        toggleDetails: { selector: "button.hamburger", hasAriaExpanded: true },
      });
      assert.equal(finding.type, "heuristic");
      assert.equal(finding.status, "pass");
    });
  });

  describe("Interaction Controls Integrity (Measured)", () => {
    test("should fail when unhandled JavaScript runtime exceptions occur", () => {
      const finding = checkInteractionIntegrity(
        { brokenHrefsCount: 0, formsMissingSubmitCount: 0, sampleBrokenControls: [] },
        ["TypeError: Cannot read property 'map' of undefined"]
      );
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "fail");
      assert.equal(finding.severity, "critical");
    });

    test("should warn on placeholder links and forms missing submit buttons", () => {
      const finding = checkInteractionIntegrity(
        {
          brokenHrefsCount: 2,
          formsMissingSubmitCount: 1,
          sampleBrokenControls: [{ tagName: "a", selector: "a#cta", reason: "Placeholder href" }],
        },
        []
      );
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "warning");
    });

    test("should pass when no interaction defects exist", () => {
      const finding = checkInteractionIntegrity(
        { brokenHrefsCount: 0, formsMissingSubmitCount: 0, sampleBrokenControls: [] },
        []
      );
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
    });
  });

  describe("Layout Stability & Dimensions (Measured)", () => {
    test("should warn when media elements lack explicit dimensions", () => {
      const finding = checkLayoutStability({
        imagesWithoutDimensionsCount: 4,
        sampleMissingDimensions: [{ src: "/hero.jpg", selector: "img.hero" }],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "warning");
    });

    test("should pass when all media have dimensions", () => {
      const finding = checkLayoutStability({
        imagesWithoutDimensionsCount: 0,
        sampleMissingDimensions: [],
      });
      assert.equal(finding.type, "measured");
      assert.equal(finding.status, "pass");
    });
  });

  describe("Manual Review Recommendations (Manual Review)", () => {
    test("should produce structured recommendations categorized as manual_review with status not_checked", () => {
      const findings = generateManualReviewFindings();
      assert.ok(findings.length >= 3);
      for (const f of findings) {
        assert.equal(f.type, "manual_review");
        assert.equal(f.status, "not_checked");
        assert.equal(f.severity, "info");
        assert.ok(f.recommendation && f.recommendation.length > 0);
      }
    });
  });
});

describe("SiteLens Mobile & UX Analyzer - Master Orchestration & Classification", () => {
  const mockCrawlResult: SinglePageCrawlResult = {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/mobile-test",
    httpStatus: 200,
    statusText: "OK",
    pageTitle: "Responsive Mobile Experience",
    metaDescription: "Test application for mobile and UX validation.",
    canonicalUrl: "https://example.com/mobile-test",
    headings: {
      h1: ["Responsive Mobile Experience"],
      h2: ["Navigation"],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      all: [{ level: "h1", text: "Responsive Mobile Experience" }],
    },
    links: [
      { href: "/home", text: "Home", isInternal: true, rel: null, target: null },
      { href: "/pricing", text: "Pricing", isInternal: true, rel: null, target: null },
    ],
    images: [{ src: "/icon.png", alt: "Logo", loading: "lazy", width: 64, height: 64 }],
    robots: { metaRobots: "index, follow", directives: ["index", "follow"] },
    viewport: {
      metaViewport: "width=device-width, initial-scale=1.0",
      hasWidthDeviceWidth: true,
      hasInitialScale: true,
      userScalableDisabled: false,
    },
    language: "en",
    openGraph: {},
    twitter: {},
    structuredData: [],
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Responsive Mobile Experience</title>
        </head>
        <body>
          <nav>
            <button aria-label="Menu" aria-expanded="false" class="hamburger">Menu</button>
          </nav>
          <main>
            <h1>Responsive Mobile Experience</h1>
            <p>Welcome to our mobile friendly website designed for all screen viewports.</p>
            <img src="/banner.jpg" width="800" height="400" alt="Banner">
          </main>
        </body>
      </html>
    `,
    textContent: "Responsive Mobile Experience. Welcome to our mobile friendly website designed for all screen viewports.",
    resources: {
      scripts: [],
      stylesheets: [],
      totalScriptsCount: 0,
      totalStylesheetsCount: 0,
      totalImagesCount: 1,
    },
    timing: {
      dnsLookupMs: 20,
      tcpConnectMs: 30,
      tlsHandshakeMs: 40,
      timeToFirstByteMs: 150,
      domContentLoadedMs: 450,
      loadCompleteMs: 820,
    },
    redirectChain: [],
    headers: {},
    isJavaScriptRendered: true,
    capturedAt: new Date().toISOString(),
    errors: [],
  };

  test("should perform static evaluation fallback accurately", () => {
    const staticData = evaluateStaticHtml(mockCrawlResult.html);
    assert.equal(staticData.viewportWidth, 375);
    assert.equal(staticData.hasHorizontalOverflow, false);
    assert.equal(staticData.navigation.hasNavLandmark, true);
    assert.equal(staticData.navigation.hasMobileToggle, true);
  });

  test("should orchestrate mobile and UX audit and clearly separate measured, heuristic, and manual_review findings", async () => {
    const analyzer = new DeterministicMobileUXAnalyzer();
    // Test with skipBrowser: true for instant unit testing
    const report = await analyzer.analyze(mockCrawlResult, { skipBrowser: true });

    assert.equal(report.targetUrl, "https://example.com/mobile-test");
    assert.equal(report.disclaimer, MOBILE_UX_DISCLAIMER);
    assert.ok(report.findings.length >= 10);

    // Verify explicit category separation
    assert.ok(report.summary.measuredCount > 0, "Must have measured issues");
    assert.ok(report.summary.heuristicCount > 0, "Must have heuristic issues");
    assert.ok(report.summary.manualReviewCount > 0, "Must have manual-review recommendations");

    assert.equal(
      report.summary.measuredCount +
        report.summary.heuristicCount +
        report.summary.manualReviewCount,
      report.summary.totalFindings
    );

    // Verify no overall score is produced
    assert.equal((report as unknown as Record<string, unknown>).score, undefined);
    assert.equal((report as unknown as Record<string, unknown>).overallScore, undefined);

    // Verify all findings have id, title, explanation, and recommendation
    for (const f of report.findings) {
      assert.ok(["measured", "heuristic", "manual_review"].includes(f.type));
      assert.ok(["mobile", "ux"].includes(f.category));
      assert.ok(["pass", "warning", "fail", "not_checked"].includes(f.status));
      assert.ok(f.explanation.length > 0);
    }
  });
});
