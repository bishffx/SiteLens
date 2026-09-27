import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates horizontal overflow at the representative mobile viewport (375px).
 * Measured issue classification.
 */
export function checkHorizontalOverflow(data: BrowserMeasuredData): MobileUXFinding {
  const { hasHorizontalOverflow, horizontalOverflowPx, scrollWidth, viewportWidth, overflowingElements } = data;

  if (hasHorizontalOverflow && horizontalOverflowPx > 0) {
    const isMajor = horizontalOverflowPx > 20;

    return {
      id: "mobile_horizontal_overflow",
      type: "measured",
      category: "mobile",
      title: "Mobile Horizontal Content Overflow",
      status: isMajor ? "fail" : "warning",
      severity: isMajor ? "critical" : "warning",
      explanation: `Page content exceeds the mobile viewport width by ${horizontalOverflowPx}px (scrollWidth: ${scrollWidth}px vs viewport: ${viewportWidth}px), causing horizontal scrolling.`,
      evidence: {
        viewportTested: "mobile_375",
        measuredScrollWidth: scrollWidth,
        measuredViewportWidth: viewportWidth,
        overflowPx: horizontalOverflowPx,
        overflowingElementsCount: overflowingElements.length,
        sampleNodes: overflowingElements.map((el) => ({
          selector: el.selector,
          html: el.htmlSnippet,
          measurements: {
            elementRight: el.right,
            elementWidth: el.width,
            overflowPx: el.overflowPx,
          },
        })),
      },
      recommendation: "Ensure layout containers use max-width: 100% and avoid fixed pixel widths (> 375px). Apply overflow-wrap: break-word to long URLs or continuous strings.",
    };
  }

  return {
    id: "mobile_horizontal_overflow",
    type: "measured",
    category: "mobile",
    title: "Mobile Horizontal Content Overflow",
    status: "pass",
    severity: "none",
    explanation: `Content fits within the mobile viewport (scrollWidth: ${scrollWidth}px matches viewport: ${viewportWidth}px) without horizontal scrolling.`,
    evidence: {
      viewportTested: "mobile_375",
      measuredScrollWidth: scrollWidth,
      measuredViewportWidth: viewportWidth,
      overflowPx: 0,
    },
    recommendation: null,
  };
}
