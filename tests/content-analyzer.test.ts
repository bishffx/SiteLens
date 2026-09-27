import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  checkVisibleTextAvailability,
  checkHeadingDistribution,
  checkContentStructure,
  checkTitleContentAlignment,
  checkParagraphStructure,
  checkExcessiveRepetition,
  checkThinContent,
  checkImageTextBalance,
  checkCallsToAction,
  checkReadability,
  calculateReadabilityMetrics,
  DeterministicContentAnalyzer,
  CONTENT_AUDIT_DISCLAIMER,
} from "../src/lib/content";
import type { SinglePageCrawlResult } from "../src/lib/types/crawler";

describe("SiteLens Content Analyzer - Unit Rules & Insufficient Evidence Handling", () => {
  describe("Visible Text Availability", () => {
    test("should return not_checked when text content is null or undefined", () => {
      const resNull = checkVisibleTextAvailability(null);
      assert.equal(resNull.status, "not_checked");
      assert.equal(resNull.evidence, null);

      const resUndef = checkVisibleTextAvailability(undefined);
      assert.equal(resUndef.status, "not_checked");
    });

    test("should fail when page has 0 visible words", () => {
      const res = checkVisibleTextAvailability("   \n\t  ");
      assert.equal(res.status, "fail");
      assert.equal(res.severity, "critical");
      assert.equal((res.evidence as { wordCount: number }).wordCount, 0);
    });

    test("should warn when page has under 30 words", () => {
      const res = checkVisibleTextAvailability("Hello world! Welcome to our minimal stub page with very few words.");
      assert.equal(res.status, "warning");
      assert.equal(res.severity, "warning");
      assert.ok((res.evidence as { wordCount: number }).wordCount < 30);
    });

    test("should pass when page has sufficient visible text", () => {
      const sample = `
        SiteLens AI is an advanced, deterministic website auditing and engineering platform.
        It inspects technical SEO, accessibility compliance, runtime web performance,
        and content quality with concrete evidence and zero fabricated metrics.
        Engineers can inspect their production applications with confidence and obtain
        transparent reports highlighting actionable remediation strategies for every dimension.
      `;
      const res = checkVisibleTextAvailability(sample);
      assert.equal(res.status, "pass");
      assert.equal(res.severity, "none");
      assert.ok((res.evidence as { wordCount: number }).wordCount >= 30);
    });
  });

  describe("Heading Distribution & Density", () => {
    test("should return not_checked when word count is less than 50", () => {
      const res = checkHeadingDistribution({ h1: ["Title"], h2: [], h3: [], h4: [], h5: [], h6: [], all: [{ level: "h1", text: "Title" }] }, 20);
      assert.equal(res.status, "not_checked");
    });

    test("should warn when 0 structural headings exist on a substantive page", () => {
      const res = checkHeadingDistribution({ h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], all: [] }, 300);
      assert.equal(res.status, "warning");
      assert.equal(res.severity, "warning");
    });

    test("should warn on high text density per heading (wall of text with 1 heading)", () => {
      const res = checkHeadingDistribution(
        { h1: ["Main"], h2: [], h3: [], h4: [], h5: [], h6: [], all: [{ level: "h1", text: "Main" }] },
        900
      );
      assert.equal(res.status, "warning");
      assert.equal((res.evidence as { wordsPerHeading: number }).wordsPerHeading, 900);
    });

    test("should pass when headings are well-proportioned to content", () => {
      const res = checkHeadingDistribution(
        {
          h1: ["Main"],
          h2: ["Section 1", "Section 2"],
          h3: ["Sub 1"],
          h4: [],
          h5: [],
          h6: [],
          all: [
            { level: "h1", text: "Main" },
            { level: "h2", text: "Section 1" },
            { level: "h2", text: "Section 2" },
            { level: "h3", text: "Sub 1" },
          ],
        },
        500
      );
      assert.equal(res.status, "pass");
      assert.equal((res.evidence as { wordsPerHeading: number }).wordsPerHeading, 125);
    });
  });

  describe("Semantic Content Structure", () => {
    test("should return not_checked if HTML is empty or missing", () => {
      const res = checkContentStructure("", 200);
      assert.equal(res.status, "not_checked");
    });

    test("should warn when substantial text is rendered with 0 semantic paragraphs or sections", () => {
      const divSoup = "<div><span>Some unsemantic body copy</span><div>More unstructured text</div></div>";
      const res = checkContentStructure(divSoup, 150);
      assert.equal(res.status, "warning");
      assert.equal((res.evidence as { paragraphCount: number }).paragraphCount, 0);
    });

    test("should pass when content is structured with <p>, <section>, and lists", () => {
      const validHtml = `
        <main>
          <section>
            <p>Welcome to our platform. We offer deterministic automated auditing tools.</p>
            <p>Here are our primary capabilities:</p>
            <ul>
              <li>SEO Checks</li>
              <li>Accessibility Checks</li>
            </ul>
          </section>
        </main>
      `;
      const res = checkContentStructure(validHtml, 80);
      assert.equal(res.status, "pass");
      assert.equal((res.evidence as { hasMainLandmark: boolean }).hasMainLandmark, true);
    });
  });

  describe("Title / Content Lexical Alignment", () => {
    test("should return not_checked if title is missing or empty", () => {
      const res = checkTitleContentAlignment("", "Valid body copy with plenty of words to evaluate content.");
      assert.equal(res.status, "not_checked");
    });

    test("should return not_checked if body copy is under 30 words", () => {
      const res = checkTitleContentAlignment("Cloud Infrastructure Audit", "Short text only.");
      assert.equal(res.status, "not_checked");
    });

    test("should warn when title keywords are completely absent from page text", () => {
      const title = "Quantum Physics Laboratory Instruments & Particle Accelerators";
      const body = `
        Welcome to the Downtown Bakery. We bake fresh artisan sourdough loaves,
        croissants, and fruit pastries every single morning before dawn.
        Visit us for specialty coffee, organic espresso, and homemade sandwiches.
        Enjoy a cozy morning seated in our warm café atmosphere with friendly baristas.
      `;
      const res = checkTitleContentAlignment(title, body);
      assert.equal(res.status, "warning");
      assert.ok((res.evidence as { alignmentRatioPercent: number }).alignmentRatioPercent < 40);
    });

    test("should pass when primary title keywords match visible page text", () => {
      const title = "SiteLens - Autonomous Website Auditing & Accessibility Platform";
      const body = `
        SiteLens is an autonomous website auditing and accessibility platform designed for modern engineering teams.
        Our auditing platform checks accessibility, performance, and SEO deterministically.
        Engineers rely on SiteLens for trustworthy, reproducible audit results across all web applications.
      `;
      const res = checkTitleContentAlignment(title, body);
      assert.equal(res.status, "pass");
      assert.ok((res.evidence as { alignmentRatioPercent: number }).alignmentRatioPercent >= 70);
    });
  });

  describe("Paragraph Structure & Length", () => {
    test("should return not_checked when HTML is missing", () => {
      const res = checkParagraphStructure("", 100);
      assert.equal(res.status, "not_checked");
    });

    test("should warn on excessively long wall-of-text paragraph (> 200 words)", () => {
      const longSentence = "This is a detailed and extensive sentence explaining technical concepts. ";
      const hugeParagraph = `<p>${longSentence.repeat(35)}</p>`; // ~280 words
      const res = checkParagraphStructure(hugeParagraph, 280);
      assert.equal(res.status, "warning");
      assert.ok((res.evidence as { excessiveParagraphsCount: number }).excessiveParagraphsCount > 0);
    });

    test("should pass when paragraphs are comfortably sized", () => {
      const comfortableHtml = `
        <p>This is the first paragraph. It introduces the application clearly and concisely with two complete sentences.</p>
        <p>This is the second paragraph. It elaborates on key features and offers helpful details for visitors.</p>
        <p>This is the third paragraph. It wraps up the section with next steps and contact details.</p>
      `;
      const res = checkParagraphStructure(comfortableHtml, 60);
      assert.equal(res.status, "pass");
      assert.equal((res.evidence as { excessiveParagraphsCount: number }).excessiveParagraphsCount, 0);
    });
  });

  describe("Excessive Repetition / Keyword Stuffing", () => {
    test("should return not_checked when text is under 80 words", () => {
      const res = checkExcessiveRepetition("Short text with few words.");
      assert.equal(res.status, "not_checked");
    });

    test("should flag critical failure when single keyword is heavily stuffed (> 12% frequency)", () => {
      const words = [];
      for (let i = 0; i < 90; i++) {
        words.push("normal", "sentence", "token", "cheapshoes");
      }
      // "cheapshoes" accounts for 25% of words
      const res = checkExcessiveRepetition(words.join(" "));
      assert.equal(res.status, "fail");
      assert.equal(res.severity, "critical");
    });

    test("should pass for natural diverse vocabulary", () => {
      const naturalText = `
        SiteLens provides deterministic website quality analysis for engineering teams.
        Instead of producing arbitrary scores, it inspects real DOM properties and network signals.
        Each finding contains reproducible evidence such as CSS selectors, HTML snippets, and metrics.
        The performance module measures actual Core Web Vitals, navigation timings, and payload weights.
        The accessibility module evaluates detectable WCAG violations using established rule engines.
        The content analyzer measures visible copy volume, readability indices, and semantic tags.
        This provides teams with actionable clarity without unnecessary ambiguity or hallucination.
      `;
      const res = checkExcessiveRepetition(naturalText);
      assert.equal(res.status, "pass");
    });
  });

  describe("Thin Content Signals", () => {
    test("should fail when visible text is under 100 words", () => {
      const res = checkThinContent("Only thirty words here. Not enough substance for an informational webpage.", "<html><body></body></html>");
      assert.equal(res.status, "fail");
      assert.equal(res.severity, "critical");
    });

    test("should warn when visible text is between 100 and 249 words", () => {
      const words = Array(150).fill("content").join(" ");
      const res = checkThinContent(words, "<html><body>...</body></html>");
      assert.equal(res.status, "warning");
      assert.equal(res.severity, "warning");
    });

    test("should pass when visible text is at least 250 words", () => {
      const words = Array(300).fill("substantive").join(" ");
      const res = checkThinContent(words, "<html><body>...</body></html>");
      assert.equal(res.status, "pass");
    });
  });

  describe("Image / Text Balance", () => {
    test("should return not_checked when 0 images and under 50 words", () => {
      const res = checkImageTextBalance(0, 30);
      assert.equal(res.status, "not_checked");
    });

    test("should warn on long-form text (> 1200 words) with 0 images", () => {
      const res = checkImageTextBalance(0, 1500);
      assert.equal(res.status, "warning");
      assert.equal(res.severity, "warning");
    });

    test("should warn on image-heavy page (>= 8 images) with minimal text (< 100 words)", () => {
      const res = checkImageTextBalance(12, 40);
      assert.equal(res.status, "warning");
    });

    test("should pass for balanced image-to-text ratio", () => {
      const res = checkImageTextBalance(3, 450);
      assert.equal(res.status, "pass");
      assert.equal((res.evidence as { wordsPerImage: number }).wordsPerImage, 150);
    });
  });

  describe("Detectable Calls-to-Action", () => {
    test("should return not_checked when no interactive controls exist", () => {
      const { checkResult } = checkCallsToAction("<p>Just plain text with no links or buttons.</p>");
      assert.equal(checkResult.status, "not_checked");
    });

    test("should warn when interactive buttons exist but contain 0 CTA phrases", () => {
      const html = `
        <button>Previous</button>
        <button>Next</button>
        <a href="/terms">Terms</a>
      `;
      const { checkResult, detectedCtas } = checkCallsToAction(html);
      assert.equal(checkResult.status, "warning");
      assert.equal(detectedCtas.length, 0);
    });

    test("should pass and extract actionable CTAs when high-intent phrases are present", () => {
      const html = `
        <a href="/register" class="btn">Get Started</a>
        <button>Book a Demo</button>
        <a href="/contact">Contact Us</a>
        <a href="/privacy">Privacy</a>
      `;
      const { checkResult, detectedCtas } = checkCallsToAction(html);
      assert.equal(checkResult.status, "pass");
      assert.equal(detectedCtas.length, 3);
      assert.ok(detectedCtas.some((c) => c.text === "Get Started"));
      assert.ok(detectedCtas.some((c) => c.text === "Book a Demo"));
      assert.ok(detectedCtas.some((c) => c.text === "Contact Us"));
    });
  });

  describe("Readability Indicators", () => {
    test("should return not_checked when language is declared as non-English", () => {
      const { checkResult } = checkReadability("Ceci est un texte en français pour tester la lisibilité.", "fr");
      assert.equal(checkResult.status, "not_checked");
    });

    test("should return not_checked when sample is under 40 words or 2 sentences", () => {
      const { checkResult } = checkReadability("Short snippet with one sentence only.", "en");
      assert.equal(checkResult.status, "not_checked");
    });

    test("should compute valid Flesch Reading Ease and Grade Level for plain English", () => {
      const text = `
        The cat sat on the green mat. It saw a tiny mouse run by quickly.
        The mouse ran under the warm wooden table. The cat looked at the mouse with calm eyes.
        The sun was shining bright outside the small window today.
        We had a cup of hot tea and watched the peaceful morning unfold.
      `;
      const metrics = calculateReadabilityMetrics(text, "en");
      assert.ok(metrics !== null);
      assert.ok(metrics.fleschReadingEase !== null && metrics.fleschReadingEase > 65);
      assert.ok(metrics.fleschKincaidGradeLevel !== null && metrics.fleschKincaidGradeLevel < 8);
    });

    test("should flag warning for extremely complex academic/dense prose", () => {
      const denseText = `
        Epistemological presuppositions necessitate comprehensive ontological deconstruction
        regarding metaphysical phenomenology and transcendental teleological paradigms.
        Supercalifragilistic hermeneutics discombobulate epistemological intersubjectivity
        through incomprehensible existential antidisestablishmentarianism and pseudointellectualization.
        Interdisciplinary dialectical materialism reconfigures socioeconomic infrastructural dynamics
        incorporating poststructuralist psychoanalytic semiotics.
        Furthermore, phenomenological investigations establish incontrovertible corroboration
        exemplifying disproportionate academic polysyllabic obfuscation across contemporaneous discourse.
      `;
      const { checkResult, readabilityMetrics } = checkReadability(denseText, "en");
      assert.ok(readabilityMetrics !== null);
      assert.equal(checkResult.status, "warning");
      assert.ok((readabilityMetrics.fleschReadingEase ?? 0) < 30);
    });
  });
});

describe("SiteLens Content Analyzer - Master Orchestration & Contract", () => {
  const mockCrawlResult: SinglePageCrawlResult = {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/audit",
    httpStatus: 200,
    statusText: "OK",
    pageTitle: "SiteLens - Autonomous Website Auditing Platform",
    metaDescription: "Deterministic technical auditing for web engineering teams.",
    canonicalUrl: "https://example.com/audit",
    headings: {
      h1: ["Autonomous Website Auditing Platform"],
      h2: ["Core Capabilities", "Detailed Reporting", "Contact Us"],
      h3: ["SEO Analysis", "Performance Analysis"],
      h4: [],
      h5: [],
      h6: [],
      all: [
        { level: "h1", text: "Autonomous Website Auditing Platform" },
        { level: "h2", text: "Core Capabilities" },
        { level: "h3", text: "SEO Analysis" },
        { level: "h3", text: "Performance Analysis" },
        { level: "h2", text: "Detailed Reporting" },
        { level: "h2", text: "Contact Us" },
      ],
    },
    links: [
      { href: "/signup", text: "Get Started Free", isInternal: true, rel: null, target: null },
      { href: "/demo", text: "Book a Demo", isInternal: true, rel: null, target: null },
      { href: "/docs", text: "Documentation", isInternal: true, rel: null, target: null },
    ],
    images: [
      { src: "/diagram.png", alt: "Architecture diagram", loading: "lazy", width: 800, height: 600 },
      { src: "/dashboard.png", alt: "Dashboard screenshot", loading: "lazy", width: 1200, height: 800 },
    ],
    robots: { metaRobots: "index, follow", directives: ["index", "follow"] },
    viewport: {
      metaViewport: "width=device-width, initial-scale=1.0",
      hasWidthDeviceWidth: true,
      hasInitialScale: true,
      userScalableDisabled: false,
    },
    language: "en-US",
    openGraph: {},
    twitter: {},
    structuredData: [],
    html: `
      <!DOCTYPE html>
      <html lang="en-US">
        <head>
          <title>SiteLens - Autonomous Website Auditing Platform</title>
        </head>
        <body>
          <main>
            <h1>Autonomous Website Auditing Platform</h1>
            <p>
              SiteLens inspects modern web applications with deterministic precision.
              Our platform empowers development and product teams to evaluate real performance,
              technical SEO, accessibility compliance, and visible content quality without artificial scoring.
            </p>
            <section>
              <h2>Core Capabilities</h2>
              <p>
                Every audit delivers concrete DOM evidence, measured network timings,
                and actionable recommendations designed specifically for senior software engineers.
              </p>
              <h3>SEO Analysis</h3>
              <p>Validates canonical tags, robots instructions, heading hierarchies, and metadata integrity.</p>
              <h3>Performance Analysis</h3>
              <p>Collects real Core Web Vitals including LCP, CLS, and TBT through Lighthouse execution.</p>
            </section>
            <section>
              <h2>Detailed Reporting</h2>
              <p>Compare consecutive audit runs and detect regressions before shipping to production.</p>
              <div class="actions">
                <a href="/signup">Get Started Free</a>
                <a href="/demo">Book a Demo</a>
              </div>
            </section>
          </main>
        </body>
      </html>
    `,
    textContent: `
      Autonomous Website Auditing Platform.
      SiteLens inspects modern web applications with deterministic precision.
      Our platform empowers development and product teams to evaluate real performance,
      technical SEO, accessibility compliance, and visible content quality without artificial scoring.
      Core Capabilities.
      Every audit delivers concrete DOM evidence, measured network timings,
      and actionable recommendations designed specifically for senior software engineers.
      SEO Analysis.
      Validates canonical tags, robots instructions, heading hierarchies, and metadata integrity.
      Performance Analysis.
      Collects real Core Web Vitals including LCP, CLS, and TBT through Lighthouse execution.
      Detailed Reporting.
      Compare consecutive audit runs and detect regressions before shipping to production.
      Get Started Free. Book a Demo.
      Get in touch with our engineering team today to schedule a technical onboarding walkthrough consultation.
    `,
    resources: {
      scripts: [],
      stylesheets: [],
      totalScriptsCount: 0,
      totalStylesheetsCount: 0,
      totalImagesCount: 2,
    },
    timing: {
      dnsLookupMs: 15,
      tcpConnectMs: 25,
      tlsHandshakeMs: 30,
      timeToFirstByteMs: 120,
      domContentLoadedMs: 450,
      loadCompleteMs: 780,
    },
    redirectChain: [],
    headers: { "content-type": "text/html; charset=utf-8" },
    isJavaScriptRendered: true,
    capturedAt: new Date().toISOString(),
    errors: [],
  };

  test("should run all 10 checks and produce structured report without an overall score", () => {
    const analyzer = new DeterministicContentAnalyzer();
    const report = analyzer.analyze(mockCrawlResult);

    assert.equal(report.targetUrl, "https://example.com/audit");
    assert.equal(report.disclaimer, CONTENT_AUDIT_DISCLAIMER);
    assert.equal(report.summary.totalChecks, 10);
    assert.ok(report.summary.passedCount > 0);
    assert.equal(
      report.summary.passedCount +
        report.summary.warningCount +
        report.summary.failedCount +
        report.summary.notCheckedCount,
      10
    );

    // Assert metrics exist
    assert.ok(report.metrics.wordCount > 100);
    assert.ok(report.metrics.readingTimeMinutes > 0);
    assert.ok(report.metrics.textToHtmlRatioPercent > 0);
    assert.ok(report.metrics.callToActionSummary.detectedCtaCount >= 2);
    assert.ok(report.metrics.readability !== null);

    // Verify no overall score field exists on report
    assert.equal((report as unknown as Record<string, unknown>).score, undefined);
    assert.equal((report as unknown as Record<string, unknown>).overallScore, undefined);

    // Every check must have checkId, name, status, and evidence or explanation
    for (const check of report.checks) {
      assert.ok(check.checkId.startsWith("content_"));
      assert.ok(["pass", "warning", "fail", "not_checked"].includes(check.status));
      assert.ok(check.explanation.length > 0);
    }
  });
});
