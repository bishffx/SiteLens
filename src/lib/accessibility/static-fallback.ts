/**
 * Static DOM Accessibility Fallback for SiteLens AI.
 * Deterministically analyzes HTML using Cheerio when live browser execution is bypassed.
 * Explicitly distinguishes automatically detectable issues from those requiring manual review.
 */

import * as cheerio from "cheerio";
import type {
  AccessibilityFinding,
  AccessibilityPassedRule,
} from "./types";

export interface StaticAuditResult {
  findings: AccessibilityFinding[];
  passedRules: AccessibilityPassedRule[];
  inapplicableRulesCount: number;
}

export function runStaticAccessibilityAudit(html: string, url: string): StaticAuditResult {
  const $ = cheerio.load(html, { xml: false });
  const findings: AccessibilityFinding[] = [];
  const passedRules: AccessibilityPassedRule[] = [];
  let inapplicableRulesCount = 0;

  // 1. Missing Image Alternative Text (image-alt)
  const images = $("img");
  if (images.length === 0) {
    inapplicableRulesCount++;
  } else {
    const missingAltNodes: Array<{ target: string[]; html: string; failureSummary: string }> = [];
    images.each((i, el) => {
      const alt = $(el).attr("alt");
      const role = $(el).attr("role");
      const ariaHidden = $(el).attr("aria-hidden");
      const isDecorative = role === "presentation" || role === "none" || ariaHidden === "true";

      if (alt === undefined && !isDecorative) {
        const src = $(el).attr("src") || `img-${i}`;
        missingAltNodes.push({
          target: [`img[src="${src}"]`],
          html: $.html(el).slice(0, 150),
          failureSummary: "Element does not have an alt attribute or presentation role.",
        });
      }
    });

    if (missingAltNodes.length > 0) {
      findings.push({
        id: "a11y_image_alt",
        engineRuleId: "image-alt",
        type: "automatically_detectable",
        severity: "critical",
        rawImpact: "critical",
        category: "accessibility",
        title: "Images must have alternate text",
        explanation: `${missingAltNodes.length} image element(s) lack an alt attribute, making visual content inaccessible to screen reader users.`,
        recommendation: 'Add a descriptive alt="..." attribute to informational images, or specify alt="" (or role="presentation") for decorative images.',
        wcagTags: ["wcag2a", "wcag111", "section508"],
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/image-alt",
        nodes: missingAltNodes,
        evidence: {
          affectedElementsCount: missingAltNodes.length,
          sampleSelectors: missingAltNodes.slice(0, 3).flatMap((n) => n.target),
          sampleSnippets: missingAltNodes.slice(0, 3).map((n) => n.html),
          failureDetails: "Fix any of the following: Element does not have an alt attribute",
        },
      });
    } else {
      passedRules.push({
        id: "image-alt",
        description: "All images specify alternative text or are marked as decorative.",
      });
    }
  }

  // 2. Missing Document Language (html-has-lang)
  const htmlTag = $("html");
  const lang = htmlTag.attr("lang");
  if (!lang || lang.trim().length === 0) {
    findings.push({
      id: "a11y_html_has_lang",
      engineRuleId: "html-has-lang",
      type: "automatically_detectable",
      severity: "critical",
      rawImpact: "serious",
      category: "accessibility",
      title: "<html> element must have a valid lang attribute",
      explanation: "The document root <html> element does not specify a language, preventing text-to-speech engines from selecting proper pronunciation.",
      recommendation: 'Add a lang attribute to the <html> tag with a valid BCP 47 language code (e.g. <html lang="en">).',
      wcagTags: ["wcag2a", "wcag311"],
      helpUrl: "https://dequeuniversity.com/rules/axe/4.13/html-has-lang",
      nodes: [
        {
          target: ["html"],
          html: "<html" + (htmlTag.attr("class") ? ` class="${htmlTag.attr("class")}"` : "") + ">",
          failureSummary: "The <html> element does not have a lang attribute.",
        },
      ],
      evidence: {
        affectedElementsCount: 1,
        sampleSelectors: ["html"],
        sampleSnippets: ["<html>"],
        failureDetails: "The <html> element does not have a lang attribute",
      },
    });
  } else {
    passedRules.push({
      id: "html-has-lang",
      description: `Document specifies primary language (${lang}).`,
    });
  }

  // 3. Form Input Labels (label)
  const formControls = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]), select, textarea');
  if (formControls.length === 0) {
    inapplicableRulesCount++;
  } else {
    const unlabelledNodes: Array<{ target: string[]; html: string; failureSummary: string }> = [];
    formControls.each((_, el) => {
      const id = $(el).attr("id");
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledby = $(el).attr("aria-labelledby");
      const title = $(el).attr("title");
      const placeholder = $(el).attr("placeholder");

      // Check if wrapped by <label>
      const hasParentLabel = $(el).closest("label").length > 0;
      // Check if referenced by <label for="id">
      const hasForLabel = id ? $(`label[for="${id}"]`).length > 0 : false;

      if (!hasParentLabel && !hasForLabel && !ariaLabel && !ariaLabelledby && !title) {
        unlabelledNodes.push({
          target: [id ? `#${id}` : el.tagName.toLowerCase()],
          html: $.html(el).slice(0, 150),
          failureSummary: placeholder
            ? "Input has a placeholder but no persistent accessible label."
            : "Form control does not have an associated <label> or aria-label.",
        });
      }
    });

    if (unlabelledNodes.length > 0) {
      findings.push({
        id: "a11y_form_label",
        engineRuleId: "label",
        type: "automatically_detectable",
        severity: "critical",
        rawImpact: "critical",
        category: "accessibility",
        title: "Form elements must have accessible labels",
        explanation: `${unlabelledNodes.length} form field(s) lack an explicit label, making their purpose ambiguous to assistive technology users.`,
        recommendation: 'Associate an explicit <label for="id"> with each form input, or add aria-label="..." when visual labels are not present.',
        wcagTags: ["wcag2a", "wcag131", "wcag412", "section508"],
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/label",
        nodes: unlabelledNodes,
        evidence: {
          affectedElementsCount: unlabelledNodes.length,
          sampleSelectors: unlabelledNodes.slice(0, 3).flatMap((n) => n.target),
          sampleSnippets: unlabelledNodes.slice(0, 3).map((n) => n.html),
          failureDetails: "Form field lacks label association",
        },
      });
    } else {
      passedRules.push({
        id: "label",
        description: "All discovered form controls have accessible labels.",
      });
    }
  }

  // 4. Button Accessible Names (button-name)
  const buttons = $("button");
  if (buttons.length === 0) {
    inapplicableRulesCount++;
  } else {
    const emptyButtons: Array<{ target: string[]; html: string; failureSummary: string }> = [];
    buttons.each((_, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledby = $(el).attr("aria-labelledby");
      const title = $(el).attr("title");
      const hasImageWithAlt = $(el).find("img[alt]").filter((__, img) => Boolean($(img).attr("alt")?.trim())).length > 0;
      const hasSvgWithTitle = $(el).find("svg title").length > 0;

      if (!text && !ariaLabel && !ariaLabelledby && !title && !hasImageWithAlt && !hasSvgWithTitle) {
        emptyButtons.push({
          target: ["button"],
          html: $.html(el).slice(0, 150),
          failureSummary: "Button does not contain discernible text or an aria-label.",
        });
      }
    });

    if (emptyButtons.length > 0) {
      findings.push({
        id: "a11y_button_name",
        engineRuleId: "button-name",
        type: "automatically_detectable",
        severity: "critical",
        rawImpact: "critical",
        category: "accessibility",
        title: "Buttons must have discernible text",
        explanation: `${emptyButtons.length} button(s) lack accessible text names, preventing screen reader users from understanding their trigger action.`,
        recommendation: 'Provide readable text content inside <button>, or declare an aria-label="..." attribute for icon-only buttons.',
        wcagTags: ["wcag2a", "wcag412", "section508"],
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/button-name",
        nodes: emptyButtons,
        evidence: {
          affectedElementsCount: emptyButtons.length,
          sampleSelectors: emptyButtons.slice(0, 3).flatMap((n) => n.target),
          sampleSnippets: emptyButtons.slice(0, 3).map((n) => n.html),
          failureDetails: "Button has no discernible text or aria-label",
        },
      });
    } else {
      passedRules.push({
        id: "button-name",
        description: "All buttons provide discernible accessible names.",
      });
    }
  }

  // 5. Link Accessible Names (link-name)
  const links = $("a[href]");
  if (links.length === 0) {
    inapplicableRulesCount++;
  } else {
    const emptyLinks: Array<{ target: string[]; html: string; failureSummary: string }> = [];
    links.each((_, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledby = $(el).attr("aria-labelledby");
      const title = $(el).attr("title");
      const hasImageWithAlt = $(el).find("img[alt]").filter((__, img) => Boolean($(img).attr("alt")?.trim())).length > 0;

      if (!text && !ariaLabel && !ariaLabelledby && !title && !hasImageWithAlt) {
        emptyLinks.push({
          target: [`a[href="${$(el).attr("href")}"]`],
          html: $.html(el).slice(0, 150),
          failureSummary: "Link has no discernible text content or alternative name.",
        });
      }
    });

    if (emptyLinks.length > 0) {
      findings.push({
        id: "a11y_link_name",
        engineRuleId: "link-name",
        type: "automatically_detectable",
        severity: "critical",
        rawImpact: "serious",
        category: "accessibility",
        title: "Links must have discernible text",
        explanation: `${emptyLinks.length} hyperlink(s) contain no discernible text or descriptive label, making navigation impossible for screen reader users.`,
        recommendation: "Ensure all hyperlinks contain descriptive anchor text or an aria-label describing the destination.",
        wcagTags: ["wcag2a", "wcag244", "wcag412", "section508"],
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/link-name",
        nodes: emptyLinks,
        evidence: {
          affectedElementsCount: emptyLinks.length,
          sampleSelectors: emptyLinks.slice(0, 3).flatMap((n) => n.target),
          sampleSnippets: emptyLinks.slice(0, 3).map((n) => n.html),
          failureDetails: "Link has no discernible text",
        },
      });
    } else {
      passedRules.push({
        id: "link-name",
        description: "All links contain discernible destination descriptions.",
      });
    }
  }

  // 6. Viewport Scalability Restrictions (meta-viewport)
  const metaViewport = $('meta[name="viewport"]').attr("content") || "";
  const lowerViewport = metaViewport.toLowerCase();
  const restrictsZoom =
    lowerViewport.includes("user-scalable=no") ||
    lowerViewport.includes("user-scalable=0") ||
    lowerViewport.includes("maximum-scale=1");

  if (restrictsZoom) {
    findings.push({
      id: "a11y_meta_viewport",
      engineRuleId: "meta-viewport",
      type: "automatically_detectable",
      severity: "critical",
      rawImpact: "critical",
      category: "accessibility",
      title: "Zooming and scaling must not be disabled",
      explanation: "Viewport meta tag restricts zoom capabilities (user-scalable=no or maximum-scale=1), preventing low-vision users from magnifying content.",
      recommendation: "Remove user-scalable=no and maximum-scale constraints from the viewport meta tag.",
      wcagTags: ["wcag2aa", "wcag144"],
      helpUrl: "https://dequeuniversity.com/rules/axe/4.13/meta-viewport",
      nodes: [
        {
          target: ['meta[name="viewport"]'],
          html: `<meta name="viewport" content="${metaViewport}">`,
          failureSummary: "user-scalable=no or maximum-scale restricts magnification.",
        },
      ],
      evidence: {
        affectedElementsCount: 1,
        sampleSelectors: ['meta[name="viewport"]'],
        sampleSnippets: [metaViewport],
        failureDetails: "user-scalable=no restricts zoom",
      },
    });
  } else if (metaViewport) {
    passedRules.push({
      id: "meta-viewport",
      description: "Viewport allows user pinch-to-zoom and scaling.",
    });
  }

  // 7. Heading Structure (heading-order)
  const headingElements = $("h1, h2, h3, h4, h5, h6");
  if (headingElements.length === 0) {
    findings.push({
      id: "a11y_heading_missing",
      engineRuleId: "heading-order",
      type: "automatically_detectable",
      severity: "warning",
      rawImpact: "moderate",
      category: "accessibility",
      title: "Page should contain heading structure",
      explanation: "No heading tags (<h1> through <h6>) were detected, impairing structural outlining.",
      recommendation: "Organize page sections using hierarchical headings starting with <h1>.",
      wcagTags: ["wcag2a", "wcag131", "section508"],
      helpUrl: "https://dequeuniversity.com/rules/axe/4.13/heading-order",
      nodes: [],
      evidence: {
        affectedElementsCount: 0,
        sampleSelectors: [],
        sampleSnippets: [],
        failureDetails: "0 headings detected",
      },
    });
  } else {
    // Check skipped heading levels
    const levels: number[] = [];
    headingElements.each((_, el) => {
      levels.push(parseInt(el.tagName.replace(/h/i, ""), 10));
    });

    const skippedJumps: string[] = [];
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i + 1] > levels[i] + 1) {
        skippedJumps.push(`H${levels[i]} -> H${levels[i + 1]}`);
      }
    }

    if (skippedJumps.length > 0) {
      findings.push({
        id: "a11y_heading_order",
        engineRuleId: "heading-order",
        type: "automatically_detectable",
        severity: "warning",
        rawImpact: "moderate",
        category: "accessibility",
        title: "Heading levels should increase sequentially",
        explanation: `Heading hierarchy contains skipped levels: ${skippedJumps.join(", ")}. Non-sequential headings disorient screen reader users navigating by heading keys.`,
        recommendation: "Ensure headings follow sequential order (e.g. follow <h2> with <h3> rather than jumping to <h4>).",
        wcagTags: ["wcag2a", "wcag131"],
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/heading-order",
        nodes: [
          {
            target: ["headings"],
            html: skippedJumps.join(", "),
            failureSummary: "Heading order does not increase by one level at a time.",
          },
        ],
        evidence: {
          affectedElementsCount: skippedJumps.length,
          sampleSelectors: skippedJumps,
          sampleSnippets: skippedJumps,
          failureDetails: "Skipped heading levels detected",
        },
      });
    } else {
      passedRules.push({
        id: "heading-order",
        description: "Headings follow a sequential hierarchy.",
      });
    }
  }

  // 8. Basic Semantic Landmarks (landmark-one-main)
  const hasMain = $("main, [role='main']").length > 0;
  if (!hasMain) {
    findings.push({
      id: "a11y_landmark_main",
      engineRuleId: "landmark-one-main",
      type: "automatically_detectable",
      severity: "warning",
      rawImpact: "moderate",
      category: "accessibility",
      title: "Page should have one main landmark",
      explanation: "No <main> element or role=\"main\" landmark was detected. Landmarks allow screen reader users to skip repeated headers and jump directly to primary content.",
      recommendation: "Wrap primary content in a semantic <main> tag.",
      wcagTags: ["wcag2a", "wcag131"],
      helpUrl: "https://dequeuniversity.com/rules/axe/4.13/landmark-one-main",
      nodes: [],
      evidence: {
        affectedElementsCount: 1,
        sampleSelectors: ["body"],
        sampleSnippets: ["<body>...</body>"],
        failureDetails: "Document does not have a main landmark",
      },
    });
  } else {
    passedRules.push({
      id: "landmark-one-main",
      description: "Document defines a semantic <main> landmark.",
    });
  }

  // 9. Manual Review Items (explicitly distinguished from automatically detectable)
  // Contrast, Focus Order, and Alt Text Quality require manual review in static parsing
  findings.push({
    id: "a11y_color_contrast_review",
    engineRuleId: "color-contrast",
    type: "requires_manual_review",
    severity: "warning",
    rawImpact: "serious",
    category: "accessibility",
    title: "Verify color contrast across text and background layers",
    explanation: "Static HTML parsing cannot compute real rendered CSS styles, background images, or alpha transparencies. Contrast ratio requires verification in a live browser context or manual review.",
    recommendation: "Test text elements with a contrast analyzer to ensure 4.5:1 ratio for normal text and 3:1 for large text.",
    wcagTags: ["wcag2aa", "wcag143"],
    helpUrl: "https://dequeuniversity.com/rules/axe/4.13/color-contrast",
    nodes: [],
    evidence: {
      affectedElementsCount: 0,
      sampleSelectors: [],
      sampleSnippets: [],
      failureDetails: "Requires rendered browser viewport for computed color sampling.",
    },
  });

  findings.push({
    id: "a11y_keyboard_navigation_review",
    engineRuleId: "keyboard-nav",
    type: "requires_manual_review",
    severity: "warning",
    rawImpact: "serious",
    category: "accessibility",
    title: "Verify keyboard navigation and visible focus rings",
    explanation: "Automated tools cannot verify logical tab order, skip links, or custom modal focus traps. Keyboard operability requires manual verification.",
    recommendation: "Tab through all interactive elements using Tab/Shift+Tab and confirm focus rings remain visible.",
    wcagTags: ["wcag2a", "wcag211", "wcag247"],
    nodes: [],
    evidence: {
      affectedElementsCount: 0,
      sampleSelectors: [],
      sampleSnippets: [],
      failureDetails: "Manual keyboard verification required.",
    },
  });

  return {
    findings,
    passedRules,
    inapplicableRulesCount,
  };
}
