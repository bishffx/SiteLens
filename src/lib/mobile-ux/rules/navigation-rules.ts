import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates mobile navigation structures and toggle accessibility.
 * Heuristic issue classification.
 */
export function checkMobileNavigation(navData: BrowserMeasuredData["navigation"]): MobileUXFinding {
  const { hasNavLandmark, hasMobileToggle, navElementsCount, toggleDetails } = navData;

  if (!hasNavLandmark && !hasMobileToggle) {
    return {
      id: "ux_mobile_navigation",
      type: "heuristic",
      category: "ux",
      title: "Mobile Navigation Accessibility",
      status: "warning",
      severity: "warning",
      explanation: "No semantic <nav> landmark or recognizable mobile menu toggle button was found on the page.",
      evidence: {
        viewportTested: "mobile_375",
        hasNavLandmark: false,
        hasMobileToggle: false,
      },
      recommendation: "Provide a semantic <nav> landmark and a clear, accessible mobile menu toggle button (e.g. hamburger button) for compact screen navigation.",
    };
  }

  if (hasMobileToggle && toggleDetails && !toggleDetails.hasAriaExpanded) {
    return {
      id: "ux_mobile_navigation",
      type: "heuristic",
      category: "ux",
      title: "Mobile Navigation Accessibility",
      status: "warning",
      severity: "warning",
      explanation: `Mobile navigation toggle (${toggleDetails.selector}) is present but lacks an aria-expanded attribute to communicate open/closed state to screen readers.`,
      evidence: {
        viewportTested: "mobile_375",
        hasNavLandmark,
        hasMobileToggle,
        toggleSelector: toggleDetails.selector,
        hasAriaExpanded: false,
      },
      recommendation: "Add aria-expanded=\"false\" (updating to \"true\" when opened) to the mobile menu button to ensure state transparency for assistive technologies.",
    };
  }

  return {
    id: "ux_mobile_navigation",
    type: "heuristic",
    category: "ux",
    title: "Mobile Navigation Accessibility",
    status: "pass",
    severity: "none",
    explanation: `Semantic mobile navigation is present (${navElementsCount} <nav> landmark${navElementsCount === 1 ? "" : "s"}${hasMobileToggle ? ", with accessible mobile menu toggle" : ""}).`,
    evidence: {
      viewportTested: "mobile_375",
      hasNavLandmark,
      hasMobileToggle,
      navElementsCount,
      toggleSelector: toggleDetails?.selector,
    },
    recommendation: null,
  };
}
