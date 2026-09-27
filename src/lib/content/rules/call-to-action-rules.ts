import * as cheerio from "cheerio";
import type { ContentCheckResult, DetectedCta } from "../types";

/**
 * Regex matching common high-intent action phrases in web interfaces.
 */
const CTA_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /\b(sign\s*up|create\s*(?:an?\s*)?account)\b/i, name: "sign up" },
  { regex: /\b(get\s*started|start\s*free|start\s*trial)\b/i, name: "get started" },
  { regex: /\b(buy\s*now|purchase|checkout|order\s*now)\b/i, name: "buy now" },
  { regex: /\b(subscribe|join\s*(?:now|us|newsletter))\b/i, name: "subscribe" },
  { regex: /\b(contact\s*(?:us|sales)?|get\s*in\s*touch|talk\s*to\s*(?:sales|us))\b/i, name: "contact" },
  { regex: /\b(download(?:\s*now)?|install(?:\s*app)?)\b/i, name: "download" },
  { regex: /\b(try\s*(?:it\s*)?free|demo|book\s*a\s*demo|schedule\s*a\s*demo)\b/i, name: "try/demo" },
  { regex: /\b(register(?:\s*now)?|rsvp)\b/i, name: "register" },
  { regex: /\b(learn\s*more|read\s*more|discover\s*more|explore(?:\s*now)?)\b/i, name: "learn more" },
  { regex: /\b(shop\s*now|view\s*pricing|see\s*plans)\b/i, name: "pricing/shop" },
];

/**
 * Evaluates detectable call-to-action (CTA) elements in HTML.
 * Note: Measures observable lexical prompts on interactive elements, not business/marketing intent.
 */
export function checkCallsToAction(html: string | undefined | null): {
  checkResult: ContentCheckResult;
  detectedCtas: DetectedCta[];
} {
  if (!html || html.trim().length === 0) {
    const checkResult: ContentCheckResult = {
      checkId: "content_calls_to_action",
      category: "content",
      name: "Detectable Calls-to-Action",
      status: "not_checked",
      severity: "none",
      explanation: "No HTML available to inspect interactive call-to-action elements.",
      evidence: null,
      recommendation: null,
    };
    return { checkResult, detectedCtas: [] };
  }

  const $ = cheerio.load(html);
  const candidateElements = $("a, button, input[type='submit'], input[type='button'], [role='button']");

  if (candidateElements.length === 0) {
    const checkResult: ContentCheckResult = {
      checkId: "content_calls_to_action",
      category: "content",
      name: "Detectable Calls-to-Action",
      status: "not_checked",
      severity: "none",
      explanation: "No interactive link or button elements were detected on the page.",
      evidence: {
        interactiveElementsCount: 0,
      },
      recommendation: null,
    };
    return { checkResult, detectedCtas: [] };
  }

  const detectedCtas: DetectedCta[] = [];
  const seenTexts = new Set<string>();

  candidateElements.each((_, el) => {
    const node = $(el);
    const tagName = (el.tagName || "").toLowerCase();
    let text = "";

    if (tagName === "input") {
      text = node.attr("value") || "";
    } else {
      text = node.text() || node.attr("aria-label") || node.attr("title") || "";
    }

    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText || cleanText.length > 60) return;

    for (const pattern of CTA_PATTERNS) {
      if (pattern.regex.test(cleanText)) {
        const key = `${cleanText.toLowerCase()}::${node.attr("href") || ""}`;
        if (!seenTexts.has(key)) {
          seenTexts.add(key);
          let tag: DetectedCta["tag"] = "a";
          if (tagName === "button") tag = "button";
          else if (tagName === "input") tag = "input";
          else if (node.attr("role") === "button") tag = "role_button";

          detectedCtas.push({
            text: cleanText,
            tag,
            href: node.attr("href") || undefined,
            patternMatched: pattern.name,
          });
        }
        break;
      }
    }
  });

  const evidence = {
    totalInteractiveElements: candidateElements.length,
    detectedCtaCount: detectedCtas.length,
    sampleCtas: detectedCtas.slice(0, 8),
  };

  if (detectedCtas.length === 0) {
    const checkResult: ContentCheckResult = {
      checkId: "content_calls_to_action",
      category: "content",
      name: "Detectable Calls-to-Action",
      status: "warning",
      severity: "warning",
      explanation: `Inspected ${candidateElements.length} interactive elements, but found no standard call-to-action phrases (such as 'Get Started', 'Sign Up', 'Contact', or 'Learn More').`,
      evidence,
      recommendation: "Provide clear, prominent action prompts to guide visitors toward key next steps or inquiries.",
    };
    return { checkResult, detectedCtas };
  }

  const checkResult: ContentCheckResult = {
    checkId: "content_calls_to_action",
    category: "content",
    name: "Detectable Calls-to-Action",
    status: "pass",
    severity: "none",
    explanation: `Found ${detectedCtas.length} distinct call-to-action prompt${detectedCtas.length === 1 ? "" : "s"} across interactive controls (e.g., "${detectedCtas[0].text}").`,
    evidence,
    recommendation: null,
  };

  return { checkResult, detectedCtas };
}
