import type { SEOCheckResult } from "../types";

export function checkTitlePresence(pageTitle: string | null): SEOCheckResult {
  if (!pageTitle || pageTitle.trim().length === 0) {
    return {
      checkId: "seo_title_presence",
      category: "seo",
      name: "Page Title Presence",
      status: "fail",
      severity: "critical",
      explanation: "The document does not contain an active <title> element in the HTML head.",
      evidence: null,
      recommendation: "Add a descriptive <title> tag inside the <head> element representing the primary topic of the page.",
    };
  }

  return {
    checkId: "seo_title_presence",
    category: "seo",
    name: "Page Title Presence",
    status: "pass",
    severity: "none",
    explanation: "Document has a valid <title> element defined.",
    evidence: pageTitle,
    recommendation: null,
  };
}

export function checkTitleLength(pageTitle: string | null): SEOCheckResult {
  if (!pageTitle || pageTitle.trim().length === 0) {
    return {
      checkId: "seo_title_length",
      category: "seo",
      name: "Page Title Length",
      status: "not_checked",
      severity: "none",
      explanation: "Title length cannot be evaluated because no title tag is present.",
      evidence: null,
      recommendation: null,
    };
  }

  const length = pageTitle.trim().length;

  if (length < 30) {
    return {
      checkId: "seo_title_length",
      category: "seo",
      name: "Page Title Length",
      status: "warning",
      severity: "warning",
      explanation: `Page title is ${length} characters, which is shorter than the recommended 30 characters.`,
      evidence: `Length: ${length} characters ("${pageTitle}")`,
      recommendation: "Expand the page title with descriptive keywords or brand identity (30–60 characters recommended).",
    };
  }

  if (length > 60) {
    return {
      checkId: "seo_title_length",
      category: "seo",
      name: "Page Title Length",
      status: "warning",
      severity: "warning",
      explanation: `Page title is ${length} characters, which exceeds the typical 60 character SERP display threshold.`,
      evidence: `Length: ${length} characters ("${pageTitle}")`,
      recommendation: "Shorten the page title to 60 characters or fewer to prevent truncation in search result snippets.",
    };
  }

  return {
    checkId: "seo_title_length",
    category: "seo",
    name: "Page Title Length",
    status: "pass",
    severity: "none",
    explanation: `Page title length (${length} characters) is within the optimal 30–60 character window.`,
    evidence: `Length: ${length} characters ("${pageTitle}")`,
    recommendation: null,
  };
}
