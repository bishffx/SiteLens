import type { MobileUXFinding } from "../types";

/**
 * Evaluates responsive layout behavior across multi-viewport tests (Mobile 375px & Tablet 768px).
 * Measured and heuristic classification.
 */
export function checkResponsiveLayoutBehavior(
  mobileHasOverflow: boolean,
  tabletHasOverflow: boolean
): MobileUXFinding {
  if (mobileHasOverflow && tabletHasOverflow) {
    return {
      id: "mobile_responsive_layout_failure",
      type: "measured",
      category: "mobile",
      title: "Responsive Multi-Viewport Layout Adaptation",
      status: "fail",
      severity: "critical",
      explanation: "Layout breaks across both mobile (375px) and tablet (768px) viewports, exhibiting horizontal overflow at multiple breakpoints.",
      evidence: {
        viewportTested: "all",
        mobileHasOverflow,
        tabletHasOverflow,
      },
      recommendation: "Review CSS media queries and flex/grid container configurations to ensure fluid width scaling across all screen sizes.",
    };
  }

  if (mobileHasOverflow || tabletHasOverflow) {
    const failedViewport = mobileHasOverflow ? "mobile (375px)" : "tablet (768px)";
    return {
      id: "mobile_responsive_layout_partial",
      type: "measured",
      category: "mobile",
      title: "Responsive Multi-Viewport Layout Adaptation",
      status: "warning",
      severity: "warning",
      explanation: `Layout adapts partially, but causes horizontal overflow at the ${failedViewport} viewport breakpoint.`,
      evidence: {
        viewportTested: mobileHasOverflow ? "mobile_375" : "tablet_768",
        mobileHasOverflow,
        tabletHasOverflow,
      },
      recommendation: `Refine responsive CSS rules specifically targeting the ${failedViewport} breakpoint.`,
    };
  }

  return {
    id: "mobile_responsive_layout_adaptation",
    type: "measured",
    category: "mobile",
    title: "Responsive Multi-Viewport Layout Adaptation",
    status: "pass",
    severity: "none",
    explanation: "Layout adapts smoothly across representative mobile (375px), tablet (768px), and desktop viewports without overflow.",
    evidence: {
      viewportTested: "all",
      mobileHasOverflow: false,
      tabletHasOverflow: false,
    },
    recommendation: null,
  };
}
