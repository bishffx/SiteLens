import type { ContentCheckResult, ReadabilityMetrics } from "../types";
import { calculateReadabilityMetrics } from "../readability";

/**
 * Evaluates text readability using deterministic Flesch formulas.
 */
export function checkReadability(
  textContent: string | undefined | null,
  language: string | undefined | null
): {
  checkResult: ContentCheckResult;
  readabilityMetrics: ReadabilityMetrics | null;
} {
  if (!textContent || textContent.trim().length === 0) {
    const checkResult: ContentCheckResult = {
      checkId: "content_readability",
      category: "content",
      name: "Readability Indicators",
      status: "not_checked",
      severity: "none",
      explanation: "No text content available to compute readability scores.",
      evidence: null,
      recommendation: null,
    };
    return { checkResult, readabilityMetrics: null };
  }

  // Check language compatibility
  if (language && !language.toLowerCase().startsWith("en")) {
    const checkResult: ContentCheckResult = {
      checkId: "content_readability",
      category: "content",
      name: "Readability Indicators",
      status: "not_checked",
      severity: "none",
      explanation: `Flesch readability formulas apply specifically to English text; page language is declared as "${language}". Readability calculation skipped.`,
      evidence: {
        declaredLanguage: language,
      },
      recommendation: null,
    };
    return { checkResult, readabilityMetrics: null };
  }

  const metrics = calculateReadabilityMetrics(textContent, language);

  if (!metrics) {
    const checkResult: ContentCheckResult = {
      checkId: "content_readability",
      category: "content",
      name: "Readability Indicators",
      status: "not_checked",
      severity: "none",
      explanation: "Insufficient text sample (minimum 40 words and 2 complete sentences required) to reliably calculate Flesch reading ease.",
      evidence: {
        textLengthChars: textContent.length,
      },
      recommendation: null,
    };
    return { checkResult, readabilityMetrics: null };
  }

  const evidence = {
    fleschReadingEase: metrics.fleschReadingEase,
    fleschKincaidGradeLevel: metrics.fleschKincaidGradeLevel,
    readingEaseLabel: metrics.readingEaseLabel,
    totalWords: metrics.totalWords,
    totalSentences: metrics.totalSentences,
    averageWordsPerSentence: metrics.averageWordsPerSentence,
    averageSyllablesPerWord: metrics.averageSyllablesPerWord,
  };

  const ease = metrics.fleschReadingEase ?? 0;
  const grade = metrics.fleschKincaidGradeLevel ?? 0;

  if (ease < 30) {
    const checkResult: ContentCheckResult = {
      checkId: "content_readability",
      category: "content",
      name: "Readability Indicators",
      status: "warning",
      severity: "warning",
      explanation: `Very challenging reading level (Flesch Reading Ease: ${ease}/100, Grade Level: ${grade} - ${metrics.readingEaseLabel}). High sentence length (${metrics.averageWordsPerSentence} words/sentence) or dense vocabulary may hinder comprehension.`,
      evidence,
      recommendation: "Shorten sentences and replace complex polysyllabic terminology with direct, concise phrasing.",
    };
    return { checkResult, readabilityMetrics: metrics };
  }

  const checkResult: ContentCheckResult = {
    checkId: "content_readability",
    category: "content",
    name: "Readability Indicators",
    status: "pass",
    severity: "none",
    explanation: `Comfortable readability (Flesch Reading Ease: ${ease}/100, Grade Level: ${grade} - ${metrics.readingEaseLabel}). Sentence length averages ${metrics.averageWordsPerSentence} words.`,
    evidence,
    recommendation: null,
  };

  return { checkResult, readabilityMetrics: metrics };
}
