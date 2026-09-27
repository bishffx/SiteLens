import type { SEOCheckResult } from "../types";
import type { ViewportInfo } from "../../types/crawler";

export function checkViewportConfiguration(
  viewport: ViewportInfo | string | null | undefined
): SEOCheckResult {
  let metaViewport: string | null = null;
  let hasWidthDeviceWidth = false;
  let userScalableDisabled = false;

  if (typeof viewport === "string") {
    metaViewport = viewport;
    const lower = viewport.toLowerCase();
    hasWidthDeviceWidth = lower.includes("width=device-width");
    userScalableDisabled =
      lower.includes("user-scalable=no") ||
      lower.includes("user-scalable=0") ||
      lower.includes("maximum-scale=1");
  } else if (viewport && typeof viewport === "object") {
    metaViewport = viewport.metaViewport;
    hasWidthDeviceWidth = viewport.hasWidthDeviceWidth;
    userScalableDisabled = viewport.userScalableDisabled;
  }

  if (!metaViewport) {
    return {
      checkId: "seo_viewport_configuration",
      category: "seo",
      name: "Mobile Viewport Tag",
      status: "fail",
      severity: "critical",
      explanation: "No viewport meta tag was found in the head. Mobile search algorithms penalize non-responsive viewports.",
      evidence: null,
      recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> inside the <head> element.",
    };
  }

  if (!hasWidthDeviceWidth) {
    return {
      checkId: "seo_viewport_configuration",
      category: "seo",
      name: "Mobile Viewport Tag",
      status: "warning",
      severity: "warning",
      explanation: "Viewport meta tag is present but missing 'width=device-width'.",
      evidence: metaViewport,
      recommendation: "Include 'width=device-width' in the viewport meta tag to adapt rendering to screen resolution.",
    };
  }

  if (userScalableDisabled) {
    return {
      checkId: "seo_viewport_configuration",
      category: "seo",
      name: "Mobile Viewport Tag",
      status: "warning",
      severity: "warning",
      explanation: "Viewport tag disables user pinch-to-zoom (user-scalable=no or maximum-scale=1). This violates mobile accessibility criteria.",
      evidence: metaViewport,
      recommendation: "Remove user zoom restrictions from the viewport meta tag.",
    };
  }

  return {
    checkId: "seo_viewport_configuration",
    category: "seo",
    name: "Mobile Viewport Tag",
    status: "pass",
    severity: "none",
    explanation: "Viewport is configured properly for responsive mobile presentation.",
    evidence: metaViewport,
    recommendation: null,
  };
}
