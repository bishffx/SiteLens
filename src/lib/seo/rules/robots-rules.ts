import type { SEOCheckResult } from "../types";
import type { RobotsInfo } from "../../types/crawler";

export function checkRobotsDirectives(
  robots: RobotsInfo | string | null | undefined
): SEOCheckResult {
  let directives: string[] = [];
  let metaRobotsStr: string | null = null;

  if (typeof robots === "string") {
    metaRobotsStr = robots;
    directives = robots.split(",").map((s) => s.trim().toLowerCase());
  } else if (robots && typeof robots === "object") {
    metaRobotsStr = robots.metaRobots;
    directives = (robots.directives || []).map((d) => d.toLowerCase());
  }

  if (directives.includes("noindex")) {
    return {
      checkId: "seo_robots_directives",
      category: "seo",
      name: "Robots Indexing Directives",
      status: "warning",
      severity: "warning",
      explanation: "Page contains a 'noindex' directive, instructing search engines not to index this page in search results.",
      evidence: metaRobotsStr || "noindex",
      recommendation: "Remove 'noindex' if this page is intended to be discoverable via search engines.",
    };
  }

  if (directives.includes("nofollow")) {
    return {
      checkId: "seo_robots_directives",
      category: "seo",
      name: "Robots Indexing Directives",
      status: "warning",
      severity: "info",
      explanation: "Page contains a 'nofollow' directive, instructing crawlers not to follow links originating from this page.",
      evidence: metaRobotsStr || "nofollow",
      recommendation: "Verify whether blocking link equity flow from this page is intentional.",
    };
  }

  return {
    checkId: "seo_robots_directives",
    category: "seo",
    name: "Robots Indexing Directives",
    status: "pass",
    severity: "none",
    explanation: metaRobotsStr
      ? `Robots directives permit indexing (${metaRobotsStr}).`
      : "No restricting robots meta tag found; page is indexable by default.",
    evidence: metaRobotsStr || "default: index, follow",
    recommendation: null,
  };
}
