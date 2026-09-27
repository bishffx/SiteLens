import type { ContentCheckResult } from "../types";
import { extractWords } from "../readability";

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves"
]);

/**
 * Evaluates lexical alignment between the page title tag and the visible body content.
 */
export function checkTitleContentAlignment(
  pageTitle: string | undefined | null,
  textContent: string | undefined | null
): ContentCheckResult {
  if (!pageTitle || pageTitle.trim().length === 0) {
    return {
      checkId: "content_title_alignment",
      category: "content",
      name: "Title & Content Alignment",
      status: "not_checked",
      severity: "none",
      explanation: "Title tag is missing or empty; cannot evaluate lexical alignment with body copy.",
      evidence: null,
      recommendation: "Define a descriptive <title> tag representing the page topic.",
    };
  }

  const cleanText = (textContent || "").toLowerCase();
  const bodyWords = extractWords(cleanText);

  if (bodyWords.length < 30) {
    return {
      checkId: "content_title_alignment",
      category: "content",
      name: "Title & Content Alignment",
      status: "not_checked",
      severity: "none",
      explanation: `Insufficient visible body text (${bodyWords.length} words) to meaningfully measure title alignment. Minimum 30 words required.`,
      evidence: {
        pageTitle,
        wordCount: bodyWords.length,
      },
      recommendation: null,
    };
  }

  // Extract significant keywords from title
  const rawTitleWords = extractWords(pageTitle.toLowerCase());
  const titleKeywords = Array.from(
    new Set(
      rawTitleWords.filter(
        (w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w)
      )
    )
  );

  if (titleKeywords.length === 0) {
    return {
      checkId: "content_title_alignment",
      category: "content",
      name: "Title & Content Alignment",
      status: "not_checked",
      severity: "none",
      explanation: "The page title does not contain identifiable substantive keywords after filtering common stop words.",
      evidence: {
        pageTitle,
      },
      recommendation: "Ensure the page title includes primary descriptive topical keywords.",
    };
  }

  // Build a set of body words
  const bodyWordSet = new Set(bodyWords);

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of titleKeywords) {
    if (bodyWordSet.has(keyword) || cleanText.includes(keyword)) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const alignmentRatio = matchedKeywords.length / titleKeywords.length;
  const alignmentRatioPercent = Math.round(alignmentRatio * 100);

  const evidence = {
    pageTitle,
    titleKeywords,
    matchedKeywords,
    missingKeywords,
    alignmentRatioPercent,
  };

  if (alignmentRatio < 0.4) {
    return {
      checkId: "content_title_alignment",
      category: "content",
      name: "Title & Content Alignment",
      status: "warning",
      severity: "warning",
      explanation: `Weak lexical alignment (${alignmentRatioPercent}%): primary title keywords (${missingKeywords.join(", ")}) do not appear in the visible page text.`,
      evidence,
      recommendation: "Incorporate the core subject keywords from your <title> tag naturally into your page's H1, subheadings, and opening paragraphs.",
    };
  }

  if (alignmentRatio < 0.7) {
    return {
      checkId: "content_title_alignment",
      category: "content",
      name: "Title & Content Alignment",
      status: "pass",
      severity: "none",
      explanation: `Moderate lexical alignment (${alignmentRatioPercent}%): most title keywords appear in page body content.`,
      evidence,
      recommendation: null,
    };
  }

  return {
    checkId: "content_title_alignment",
    category: "content",
    name: "Title & Content Alignment",
    status: "pass",
    severity: "none",
    explanation: `Strong lexical alignment (${alignmentRatioPercent}%): title keywords match prominently with visible body text.`,
    evidence,
    recommendation: null,
  };
}
