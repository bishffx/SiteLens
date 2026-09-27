import { describe, it } from "node:test";
import assert from "node:assert";
import {
  DeterministicAccessibilityAnalyzer,
  defaultDeterministicAccessibilityAnalyzer,
  WCAG_AUTOMATED_AUDIT_DISCLAIMER,
} from "../src/lib/accessibility/accessibility-analyzer";
import { runStaticAccessibilityAudit } from "../src/lib/accessibility/static-fallback";
import type { SinglePageCrawlResult } from "../src/lib/types/crawler";

function createMockCrawl(html: string): SinglePageCrawlResult {
  return {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    httpStatus: 200,
    statusText: "OK",
    pageTitle: "Test Page",
    html,
    metaDescription: "Test description",
    canonicalUrl: "https://example.com/",
    headings: {
      h1: ["Title"],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      all: [{ level: "h1", text: "Title" }],
    },
    links: [],
    images: [],
    robots: { metaRobots: "index, follow", directives: ["index", "follow"] },
    viewport: {
      metaViewport: "width=device-width, initial-scale=1",
      hasWidthDeviceWidth: true,
      hasInitialScale: true,
      userScalableDisabled: false,
    },
    language: "en",
    openGraph: {},
    twitter: {},
    structuredData: [],
    textContent: "Text",
    resources: {
      scripts: [],
      stylesheets: [],
      totalScriptsCount: 0,
      totalStylesheetsCount: 0,
      totalImagesCount: 0,
    },
    timing: {
      dnsLookupMs: 10,
      tcpConnectMs: 20,
      tlsHandshakeMs: 30,
      timeToFirstByteMs: 80,
      domContentLoadedMs: 200,
      loadCompleteMs: 400,
    },
    redirectChain: [],
    headers: { "content-type": "text/html" },
    isJavaScriptRendered: true,
    capturedAt: new Date().toISOString(),
    errors: [],
  };
}

describe("SiteLens Accessibility Analyzer - Deterministic Rules & Evidence", () => {
  it("should detect missing image alt text and provide concrete HTML evidence", () => {
    const html = `
      <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Heading</h1>
            <img src="/logo.png">
            <img src="/photo.jpg" alt="A sunny beach">
          </main>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const imageAltFinding = audit.findings.find((f) => f.engineRuleId === "image-alt");

    assert.ok(imageAltFinding, "Must report image-alt violation");
    assert.strictEqual(imageAltFinding.type, "automatically_detectable");
    assert.strictEqual(imageAltFinding.severity, "critical");
    assert.strictEqual(imageAltFinding.evidence.affectedElementsCount, 1);
    assert.ok(imageAltFinding.evidence.sampleSelectors.some((s) => s.includes("logo.png")));
    assert.ok(imageAltFinding.evidence.sampleSnippets[0].includes("/logo.png"));
    assert.ok(imageAltFinding.recommendation.length > 0);
  });

  it("should detect missing document language on <html> element", () => {
    const html = `
      <html>
        <head><title>No Language</title></head>
        <body><main><h1>Welcome</h1></main></body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const langFinding = audit.findings.find((f) => f.engineRuleId === "html-has-lang");

    assert.ok(langFinding, "Must report html-has-lang violation");
    assert.strictEqual(langFinding.type, "automatically_detectable");
    assert.strictEqual(langFinding.severity, "critical");
    assert.strictEqual(langFinding.evidence.sampleSelectors[0], "html");
  });

  it("should detect unlabelled form inputs", () => {
    const html = `
      <html lang="en">
        <head><title>Form Test</title></head>
        <body>
          <main>
            <h1>Login</h1>
            <input type="email" placeholder="Enter email">
            <label for="password">Password</label>
            <input type="password" id="password">
          </main>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const labelFinding = audit.findings.find((f) => f.engineRuleId === "label");

    assert.ok(labelFinding, "Must report label violation for unlabelled input");
    assert.strictEqual(labelFinding.type, "automatically_detectable");
    assert.strictEqual(labelFinding.severity, "critical");
    assert.strictEqual(labelFinding.evidence.affectedElementsCount, 1);
  });

  it("should detect buttons lacking accessible names", () => {
    const html = `
      <html lang="en">
        <head><title>Button Test</title></head>
        <body>
          <main>
            <h1>Actions</h1>
            <button></button>
            <button aria-label="Close modal">X</button>
          </main>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const btnFinding = audit.findings.find((f) => f.engineRuleId === "button-name");

    assert.ok(btnFinding, "Must report empty button");
    assert.strictEqual(btnFinding.type, "automatically_detectable");
    assert.strictEqual(btnFinding.severity, "critical");
    assert.strictEqual(btnFinding.evidence.affectedElementsCount, 1);
  });

  it("should detect hyperlinks without discernible anchor text", () => {
    const html = `
      <html lang="en">
        <head><title>Link Test</title></head>
        <body>
          <main>
            <h1>Navigation</h1>
            <a href="/empty"></a>
            <a href="/home">Home</a>
          </main>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const linkFinding = audit.findings.find((f) => f.engineRuleId === "link-name");

    assert.ok(linkFinding, "Must report empty hyperlink");
    assert.strictEqual(linkFinding.type, "automatically_detectable");
    assert.strictEqual(linkFinding.severity, "critical");
    assert.strictEqual(linkFinding.evidence.affectedElementsCount, 1);
  });

  it("should flag viewport zooming restrictions (user-scalable=no)", () => {
    const html = `
      <html lang="en">
        <head>
          <title>Zoom Test</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
        </head>
        <body><main><h1>Zoom locked</h1></main></body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const vpFinding = audit.findings.find((f) => f.engineRuleId === "meta-viewport");

    assert.ok(vpFinding, "Must report user-scalable=no zoom lock");
    assert.strictEqual(vpFinding.type, "automatically_detectable");
    assert.strictEqual(vpFinding.severity, "critical");
  });

  it("should flag skipped heading levels (H1 to H3)", () => {
    const html = `
      <html lang="en">
        <head><title>Heading Test</title></head>
        <body>
          <main>
            <h1>Main Title</h1>
            <h3>Sub-sub Heading (Skipped H2)</h3>
          </main>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const hFinding = audit.findings.find((f) => f.engineRuleId === "heading-order");

    assert.ok(hFinding, "Must report skipped heading order");
    assert.strictEqual(hFinding.type, "automatically_detectable");
    assert.strictEqual(hFinding.severity, "warning");
  });

  it("should flag missing semantic <main> landmark", () => {
    const html = `
      <html lang="en">
        <head><title>No Main</title></head>
        <body>
          <div class="content"><h1>No main tag here</h1></div>
        </body>
      </html>
    `;

    const audit = runStaticAccessibilityAudit(html, "https://example.com");
    const mainFinding = audit.findings.find((f) => f.engineRuleId === "landmark-one-main");

    assert.ok(mainFinding, "Must report missing main landmark");
    assert.strictEqual(mainFinding.type, "automatically_detectable");
    assert.strictEqual(mainFinding.severity, "warning");
  });
});

describe("SiteLens Accessibility Analyzer - Explicit Type Distinction & WCAG Scope", () => {
  it("should explicitly distinguish 'automatically_detectable' from 'requires_manual_review'", async () => {
    const accessibleHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Accessible Page</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <main>
            <h1>Accessible Title</h1>
            <p>Content</p>
            <img src="/photo.jpg" alt="Accessible description">
            <button>Click me</button>
            <a href="/dest">Destination</a>
          </main>
        </body>
      </html>
    `;

    const analyzer = new DeterministicAccessibilityAnalyzer();
    const report = await analyzer.analyze(createMockCrawl(accessibleHtml), {
      skipBrowser: true,
    });

    // Zero automatically detectable violations on clean page
    assert.strictEqual(report.summary.automaticallyDetectableCount, 0);

    // Items requiring manual review MUST be categorized as requires_manual_review
    assert.ok(report.summary.requiresManualReviewCount > 0);
    const manualReviewItems = report.findings.filter((f) => f.type === "requires_manual_review");
    assert.strictEqual(manualReviewItems.length, report.summary.requiresManualReviewCount);

    for (const item of manualReviewItems) {
      assert.strictEqual(item.type, "requires_manual_review");
      assert.ok(item.title.toLowerCase().includes("manual review") || item.title.toLowerCase().includes("verify"));
    }
  });

  it("should include explicit WCAG non-compliance disclaimer without claiming full certification", async () => {
    const html = `
      <html lang="en">
        <head><title>Test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body><main><h1>Hello</h1></main></body>
      </html>
    `;

    const analyzer = defaultDeterministicAccessibilityAnalyzer;
    const report = await analyzer.analyze(createMockCrawl(html), {
      skipBrowser: true,
    });

    assert.ok(report.wcagDisclaimer);
    assert.strictEqual(report.wcagDisclaimer, WCAG_AUTOMATED_AUDIT_DISCLAIMER);
    assert.ok(report.wcagDisclaimer.includes("30% to 57%"));
    assert.ok(report.wcagDisclaimer.includes("screen readers"));

    // Verify that NO overall score property exists on report
    assert.strictEqual((report as unknown as Record<string, unknown>).score, undefined);
    assert.strictEqual((report as unknown as Record<string, unknown>).overallScore, undefined);
  });

  it("should tally summary counts correctly and preserve rule passing data", async () => {
    const html = `
      <html lang="en">
        <head><title>Test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body>
          <main>
            <h1>Test</h1>
            <img src="bad.jpg">
          </main>
        </body>
      </html>
    `;

    const analyzer = new DeterministicAccessibilityAnalyzer();
    const report = await analyzer.analyze(createMockCrawl(html), {
      skipBrowser: true,
    });

    const {
      totalFindings,
      automaticallyDetectableCount,
      requiresManualReviewCount,
      passedRulesCount,
    } = report.summary;

    assert.strictEqual(automaticallyDetectableCount + requiresManualReviewCount, totalFindings);
    assert.ok(passedRulesCount > 0, "Passed rules should be tracked");
    assert.ok(report.passedRules.length === passedRulesCount);
  });
});
