import type { MobileUXFinding } from "../types";
import type { BasicPageTiming } from "../../types/crawler";

/**
 * Evaluates real page loading usability from crawler network timings.
 * Measured issue classification.
 */
export function checkLoadingUsability(timing: BasicPageTiming | undefined | null): MobileUXFinding {
  if (!timing) {
    return {
      id: "ux_page_loading_usability",
      type: "measured",
      category: "ux",
      title: "Page Loading Usability",
      status: "not_checked",
      severity: "none",
      explanation: "No network navigation timing was recorded.",
      evidence: null,
      recommendation: null,
    };
  }

  const { timeToFirstByteMs, domContentLoadedMs, loadCompleteMs } = timing;

  if (loadCompleteMs > 6000 || (timeToFirstByteMs !== null && timeToFirstByteMs > 2500)) {
    return {
      id: "ux_page_loading_usability",
      type: "measured",
      category: "ux",
      title: "Page Loading Usability",
      status: "fail",
      severity: "critical",
      explanation: `Slow page load responsiveness (${loadCompleteMs}ms total, ${timeToFirstByteMs ?? "N/A"}ms TTFB). Users on mobile connections frequently abandon pages that take over 5 seconds to load.`,
      evidence: {
        timeToFirstByteMs,
        domContentLoadedMs,
        loadCompleteMs,
      },
      recommendation: "Optimize server response times (TTFB) via edge caching, compress media, and defer non-critical JavaScript to speed up initial page rendering.",
    };
  }

  if (loadCompleteMs > 3000 || (timeToFirstByteMs !== null && timeToFirstByteMs > 1200)) {
    return {
      id: "ux_page_loading_usability",
      type: "measured",
      category: "ux",
      title: "Page Loading Usability",
      status: "warning",
      severity: "warning",
      explanation: `Moderate page loading latency (${loadCompleteMs}ms total, ${timeToFirstByteMs ?? "N/A"}ms TTFB). Consider optimizing assets to improve mobile user retention.`,
      evidence: {
        timeToFirstByteMs,
        domContentLoadedMs,
        loadCompleteMs,
      },
      recommendation: "Reduce resource payload sizes and preload critical fonts/stylesheets to achieve sub-2.5s page loads.",
    };
  }

  return {
    id: "ux_page_loading_usability",
    type: "measured",
    category: "ux",
    title: "Page Loading Usability",
    status: "pass",
    severity: "none",
    explanation: `Fast loading usability (${loadCompleteMs}ms total, ${timeToFirstByteMs ?? "N/A"}ms TTFB, DOM interactive in ${domContentLoadedMs ?? "N/A"}ms).`,
    evidence: {
      timeToFirstByteMs,
      domContentLoadedMs,
      loadCompleteMs,
    },
    recommendation: null,
  };
}
