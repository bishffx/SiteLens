import type { SEOCheckResult } from "../types";
import type { RobotsInfo } from "../../types/crawler";

export interface IndexabilityEvaluation {
  checkResult: SEOCheckResult;
  isIndexable: boolean;
}

export function checkIndexabilitySignals(
  finalUrl: string,
  httpStatus: number | null,
  robots: RobotsInfo | string | null | undefined,
  headers?: Record<string, string> | null
): IndexabilityEvaluation {
  const isHttps = finalUrl.startsWith("https://");

  let hasNoindexDirective = false;
  let metaRobotsStr: string | null = null;
  if (typeof robots === "string") {
    metaRobotsStr = robots;
    hasNoindexDirective = robots.toLowerCase().includes("noindex");
  } else if (robots && typeof robots === "object") {
    metaRobotsStr = robots.metaRobots;
    hasNoindexDirective = (robots.directives || [])
      .map((d) => d.toLowerCase())
      .includes("noindex");
  }

  // Check X-Robots-Tag in HTTP response headers
  const safeHeaders = headers || {};
  const xRobots = safeHeaders["x-robots-tag"] || safeHeaders["x-robots"] || "";
  const hasXRobotsNoindex = xRobots.toLowerCase().includes("noindex");

  const blocksIndex = hasNoindexDirective || hasXRobotsNoindex;
  const is200 = httpStatus === 200;

  const isIndexable = is200 && !blocksIndex;

  if (!is200) {
    return {
      isIndexable: false,
      checkResult: {
        checkId: "seo_indexability_signals",
        category: "seo",
        name: "Page Indexability Signals",
        status: "fail",
        severity: "critical",
        explanation: `Target page returned HTTP status ${httpStatus ?? "none"}. Search engines cannot index non-200 pages.`,
        evidence: { httpStatus, isIndexable: false },
        recommendation: "Ensure the page resolves with HTTP 200 OK without errors or redirects.",
      },
    };
  }

  if (blocksIndex) {
    return {
      isIndexable: false,
      checkResult: {
        checkId: "seo_indexability_signals",
        category: "seo",
        name: "Page Indexability Signals",
        status: "warning",
        severity: "warning",
        explanation: "Page is served with HTTP 200 but explicitly blocks search indexing via noindex directives.",
        evidence: {
          metaRobots: metaRobotsStr,
          xRobotsTag: xRobots || null,
          isIndexable: false,
        },
        recommendation: "Remove noindex headers and meta tags if organic search visibility is desired.",
      },
    };
  }

  if (!isHttps) {
    return {
      isIndexable: true,
      checkResult: {
        checkId: "seo_indexability_signals",
        category: "seo",
        name: "Page Indexability Signals",
        status: "warning",
        severity: "warning",
        explanation: "Page is indexable, but is served over insecure HTTP instead of HTTPS (HTTPS is a Google search ranking signal).",
        evidence: { url: finalUrl, isHttps: false },
        recommendation: "Enforce HTTPS with an SSL certificate and 301 redirect HTTP traffic.",
      },
    };
  }

  return {
    isIndexable: true,
    checkResult: {
      checkId: "seo_indexability_signals",
      category: "seo",
      name: "Page Indexability Signals",
      status: "pass",
      severity: "none",
      explanation: "Page meets core indexability signals: HTTP 200 OK, secure HTTPS, and no indexing blockers.",
      evidence: { httpStatus: 200, isHttps: true, isIndexable: true },
      recommendation: null,
    },
  };
}
