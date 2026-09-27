import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates mobile tap target dimensions and proximity.
 * Measured issue classification.
 */
export function checkTapTargets(tapData: BrowserMeasuredData["tapTargets"]): MobileUXFinding {
  const { totalEvaluated, sampleUndersized, crowdedCount } = tapData;

  if (totalEvaluated === 0) {
    return {
      id: "mobile_tap_targets",
      type: "measured",
      category: "mobile",
      title: "Tap Target Sizing & Proximity",
      status: "not_checked",
      severity: "none",
      explanation: "No interactive links, buttons, or form controls were detected to evaluate touch targets.",
      evidence: {
        viewportTested: "mobile_375",
        totalEvaluated: 0,
      },
      recommendation: null,
    };
  }

  // Critical check: any interactive target smaller than 24x24px
  const severelyUndersized = sampleUndersized.filter((t) => t.width < 24 || t.height < 24);

  if (severelyUndersized.length > 0) {
    return {
      id: "mobile_tap_targets",
      type: "measured",
      category: "mobile",
      title: "Tap Target Sizing & Proximity",
      status: "fail",
      severity: "critical",
      explanation: `Found ${severelyUndersized.length} severely undersized interactive touch targets (< 24×24px). Tiny tap targets lead to high touch error rates on mobile touchscreens.`,
      evidence: {
        viewportTested: "mobile_375",
        totalEvaluated,
        undersizedCount: sampleUndersized.length,
        severelyUndersizedCount: severelyUndersized.length,
        crowdedCount,
        sampleNodes: severelyUndersized.map((t) => ({
          selector: t.selector,
          measurements: {
            widthPx: t.width,
            heightPx: t.height,
            text: t.text,
          },
        })),
      },
      recommendation: "Ensure interactive elements meet the minimum WCAG 2.2 AA target size of 24×24px, and ideally 44×44px or 48×48px for comfortable thumb navigation.",
    };
  }

  if (sampleUndersized.length > 0 || crowdedCount > 0) {
    return {
      id: "mobile_tap_targets",
      type: "measured",
      category: "mobile",
      title: "Tap Target Sizing & Proximity",
      status: "warning",
      severity: "warning",
      explanation: `Detected touch usability concerns: ${sampleUndersized.length} target(s) smaller than recommended 44×44px, and ${crowdedCount} adjacent target(s) spaced less than 8px apart.`,
      evidence: {
        viewportTested: "mobile_375",
        totalEvaluated,
        undersizedCount: sampleUndersized.length,
        crowdedCount,
        sampleNodes: sampleUndersized.map((t) => ({
          selector: t.selector,
          measurements: {
            widthPx: t.width,
            heightPx: t.height,
            text: t.text,
          },
        })),
      },
      recommendation: "Increase padding or min-height/min-width on buttons and links to at least 44×44px, and maintain at least 8px margin between neighboring interactive targets.",
    };
  }

  return {
    id: "mobile_tap_targets",
    type: "measured",
    category: "mobile",
    title: "Tap Target Sizing & Proximity",
    status: "pass",
    severity: "none",
    explanation: `All ${totalEvaluated} evaluated touch targets meet recommended mobile dimensions (>= 44×44px) with adequate spacing.`,
    evidence: {
      viewportTested: "mobile_375",
      totalEvaluated,
      undersizedCount: 0,
      crowdedCount: 0,
    },
    recommendation: null,
  };
}
