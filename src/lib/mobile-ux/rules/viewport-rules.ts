import type { MobileUXFinding } from "../types";
import type { ViewportInfo } from "../../types/crawler";

/**
 * Evaluates mobile viewport configuration (<meta name="viewport">).
 * Heuristic issue classification.
 */
export function checkViewportMeta(viewport: ViewportInfo | undefined | null): MobileUXFinding {
  if (!viewport || !viewport.metaViewport) {
    return {
      id: "mobile_viewport_missing",
      type: "heuristic",
      category: "mobile",
      title: "Mobile Viewport Configuration",
      status: "fail",
      severity: "critical",
      explanation: "No <meta name=\"viewport\"> tag was detected. Mobile browsers will render the page at desktop width (typically 980px) and scale it down, requiring manual zooming.",
      evidence: {
        viewportTested: "all",
        metaViewport: null,
      },
      recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> inside the <head> element.",
    };
  }

  const rawMeta = viewport.metaViewport.toLowerCase();

  if (viewport.userScalableDisabled) {
    return {
      id: "mobile_viewport_zooming_disabled",
      type: "heuristic",
      category: "mobile",
      title: "Mobile Viewport Zooming Restriction",
      status: "warning",
      severity: "warning",
      explanation: "The viewport tag disables user zooming (user-scalable=no or maximum-scale=1.0). This creates significant usability barriers for users with low vision.",
      evidence: {
        viewportTested: "all",
        metaViewport: viewport.metaViewport,
        userScalableDisabled: true,
      },
      recommendation: "Remove user-scalable=no and maximum-scale=1.0 from the viewport meta tag to permit pinch-to-zoom.",
    };
  }

  if (!viewport.hasWidthDeviceWidth || !viewport.hasInitialScale) {
    return {
      id: "mobile_viewport_incomplete",
      type: "heuristic",
      category: "mobile",
      title: "Mobile Viewport Configuration",
      status: "warning",
      severity: "warning",
      explanation: "Viewport meta tag is declared but is missing either width=device-width or initial-scale=1.0.",
      evidence: {
        viewportTested: "all",
        metaViewport: viewport.metaViewport,
        hasWidthDeviceWidth: viewport.hasWidthDeviceWidth,
        hasInitialScale: viewport.hasInitialScale,
      },
      recommendation: "Update the viewport meta tag to standard: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">.",
    };
  }

  return {
    id: "mobile_viewport_configured",
    type: "heuristic",
    category: "mobile",
    title: "Mobile Viewport Configuration",
    status: "pass",
    severity: "none",
    explanation: "Responsive viewport is correctly configured (width=device-width, initial-scale=1.0) without restricting user scaling.",
    evidence: {
      viewportTested: "all",
      metaViewport: viewport.metaViewport,
    },
    recommendation: null,
  };
}
