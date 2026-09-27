/**
 * Static DOM Evaluator Fallback for Mobile and UX analysis.
 * Analyzes HTML via Cheerio when headless browser execution is unavailable or skipped.
 */

import * as cheerio from "cheerio";
import type { BrowserMeasuredData } from "./dom-evaluator";

export function evaluateStaticHtml(html: string): BrowserMeasuredData {
  const $ = cheerio.load(html);

  // 1. Fixed width layout detection (indicative of horizontal overflow on mobile)
  const fixedWidthElements: BrowserMeasuredData["overflowingElements"] = [];
  $("[style*='width']").each((_, el) => {
    const style = $(el).attr("style") || "";
    const match = style.match(/width\s*:\s*(\d+)px/i);
    if (match) {
      const widthVal = parseInt(match[1], 10);
      if (widthVal > 400 && fixedWidthElements.length < 5) {
        fixedWidthElements.push({
          selector: el.tagName.toLowerCase() + ($(el).attr("id") ? `#${$(el).attr("id")}` : ""),
          tagName: el.tagName.toLowerCase(),
          right: widthVal,
          width: widthVal,
          overflowPx: widthVal - 375,
          htmlSnippet: $.html(el).slice(0, 120),
        });
      }
    }
  });

  const hasHorizontalOverflow = fixedWidthElements.length > 0;
  const horizontalOverflowPx = hasHorizontalOverflow ? fixedWidthElements[0].overflowPx : 0;

  // 2. Interactive elements count
  const interactiveElements = $("a, button, input:not([type='hidden']), select, textarea, [role='button']");
  const totalEvaluated = interactiveElements.length;

  // 3. Layout Stability: Images missing dimensions
  const sampleMissingDimensions: BrowserMeasuredData["layoutStability"]["sampleMissingDimensions"] = [];
  let imagesWithoutDimensionsCount = 0;

  $("img").each((_, el) => {
    const hasWidth = $(el).attr("width");
    const hasHeight = $(el).attr("height");
    const style = $(el).attr("style") || "";
    const hasStyleDims = style.includes("width") && style.includes("height");

    if (!hasWidth && !hasHeight && !hasStyleDims) {
      imagesWithoutDimensionsCount++;
      if (sampleMissingDimensions.length < 5) {
        sampleMissingDimensions.push({
          src: $(el).attr("src") || "",
          selector: "img" + ($(el).attr("class") ? `.${$(el).attr("class")?.split(" ")[0]}` : ""),
        });
      }
    }
  });

  // 4. Navigation Landmarks & Mobile Toggle
  const navLandmarks = $("nav, [role='navigation']");
  const hasNavLandmark = navLandmarks.length > 0;

  let hasMobileToggle = false;
  let toggleDetails: BrowserMeasuredData["navigation"]["toggleDetails"] = undefined;

  $("button, [role='button'], a[aria-expanded], [aria-label*='menu' i]").each((_, el) => {
    const ariaLabel = ($(el).attr("aria-label") || "").toLowerCase();
    const className = ($(el).attr("class") || "").toLowerCase();
    const hasAriaExpanded = $(el).attr("aria-expanded") !== undefined;

    if (
      ariaLabel.includes("menu") ||
      ariaLabel.includes("nav") ||
      className.includes("hamburger") ||
      className.includes("menu") ||
      hasAriaExpanded
    ) {
      hasMobileToggle = true;
      toggleDetails = {
        selector: el.tagName.toLowerCase() + ($(el).attr("id") ? `#${$(el).attr("id")}` : ""),
        hasAriaExpanded,
      };
      return false; // break
    }
  });

  // 5. Interaction Controls Integrity
  let brokenHrefsCount = 0;
  const sampleBrokenControls: BrowserMeasuredData["interactionIntegrity"]["sampleBrokenControls"] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href === "" || href === "#" || href?.startsWith("javascript:void(0)")) {
      brokenHrefsCount++;
      if (sampleBrokenControls.length < 5) {
        sampleBrokenControls.push({
          tagName: "a",
          selector: "a" + ($(el).attr("id") ? `#${$(el).attr("id")}` : ""),
          reason: `Placeholder or unnavigable href: "${href}"`,
        });
      }
    }
  });

  let formsMissingSubmitCount = 0;
  $("form").each((_, el) => {
    const submitBtn = $(el).find("button[type='submit'], input[type='submit'], button:not([type])");
    if (submitBtn.length === 0) {
      formsMissingSubmitCount++;
      if (sampleBrokenControls.length < 5) {
        sampleBrokenControls.push({
          tagName: "form",
          selector: "form" + ($(el).attr("id") ? `#${$(el).attr("id")}` : ""),
          reason: "Form missing explicit submit button control",
        });
      }
    }
  });

  return {
    viewportWidth: 375,
    viewportHeight: 667,
    scrollWidth: hasHorizontalOverflow ? 375 + horizontalOverflowPx : 375,
    scrollHeight: 1000,
    hasHorizontalOverflow,
    horizontalOverflowPx,
    overflowingElements: fixedWidthElements,
    tapTargets: {
      totalEvaluated,
      undersizedCount: 0,
      crowdedCount: 0,
      sampleUndersized: [],
    },
    typography: {
      minimumFontSizePx: null,
      smallFontElementsCount: 0,
      sampleSmallFonts: [],
    },
    layoutStability: {
      imagesWithoutDimensionsCount,
      sampleMissingDimensions,
    },
    navigation: {
      hasNavLandmark,
      hasMobileToggle,
      navElementsCount: navLandmarks.length,
      toggleDetails,
    },
    interactionIntegrity: {
      brokenHrefsCount,
      formsMissingSubmitCount,
      sampleBrokenControls,
    },
  };
}
