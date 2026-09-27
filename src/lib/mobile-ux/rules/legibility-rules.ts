import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates mobile font legibility on the representative mobile viewport.
 * Measured issue classification.
 */
export function checkMobileLegibility(typography: BrowserMeasuredData["typography"]): MobileUXFinding {
  const { minimumFontSizePx, smallFontElementsCount, sampleSmallFonts } = typography;

  if (minimumFontSizePx === null) {
    return {
      id: "mobile_font_legibility",
      type: "measured",
      category: "mobile",
      title: "Mobile Content Font Legibility",
      status: "not_checked",
      severity: "none",
      explanation: "No textual elements were available to compute rendered font sizes.",
      evidence: null,
      recommendation: null,
    };
  }

  if (minimumFontSizePx < 10) {
    return {
      id: "mobile_font_legibility",
      type: "measured",
      category: "mobile",
      title: "Mobile Content Font Legibility",
      status: "fail",
      severity: "critical",
      explanation: `Extremely small text detected on mobile (minimum font size: ${minimumFontSizePx}px). Text under 10px is nearly illegible on handheld mobile screens.`,
      evidence: {
        viewportTested: "mobile_375",
        minimumFontSizePx,
        smallFontElementsCount,
        sampleNodes: sampleSmallFonts.map((f) => ({
          selector: f.selector,
          measurements: {
            fontSizePx: f.fontSizePx,
            textSample: f.text,
          },
        })),
      },
      recommendation: "Increase mobile body font sizes to at least 14px or 16px to ensure effortless reading without zooming.",
    };
  }

  if (smallFontElementsCount > 0) {
    return {
      id: "mobile_font_legibility",
      type: "measured",
      category: "mobile",
      title: "Mobile Content Font Legibility",
      status: "warning",
      severity: "warning",
      explanation: `Found ${smallFontElementsCount} text element(s) with computed font size smaller than 12px (minimum: ${minimumFontSizePx}px).`,
      evidence: {
        viewportTested: "mobile_375",
        minimumFontSizePx,
        smallFontElementsCount,
        sampleNodes: sampleSmallFonts.map((f) => ({
          selector: f.selector,
          measurements: {
            fontSizePx: f.fontSizePx,
            textSample: f.text,
          },
        })),
      },
      recommendation: "Set a base font size of at least 14px or 16px for secondary text, labels, and captions on mobile viewports.",
    };
  }

  return {
    id: "mobile_font_legibility",
    type: "measured",
    category: "mobile",
    title: "Mobile Content Font Legibility",
    status: "pass",
    severity: "none",
    explanation: `Legible typography across the mobile viewport (minimum computed font size: ${minimumFontSizePx}px, zero text elements below 12px).`,
    evidence: {
      viewportTested: "mobile_375",
      minimumFontSizePx,
      smallFontElementsCount: 0,
    },
    recommendation: null,
  };
}
