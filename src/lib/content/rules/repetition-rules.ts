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

export interface RepeatedTerm {
  word: string;
  count: number;
  frequencyPercent: number;
}

/**
 * Checks for excessive word repetition and potential keyword stuffing.
 */
export function checkExcessiveRepetition(textContent: string | undefined | null): ContentCheckResult {
  if (!textContent || textContent.trim().length === 0) {
    return {
      checkId: "content_excessive_repetition",
      category: "content",
      name: "Repetition & Keyword Density",
      status: "not_checked",
      severity: "none",
      explanation: "No text content available to evaluate repetition.",
      evidence: null,
      recommendation: null,
    };
  }

  const words = extractWords(textContent.toLowerCase());
  const totalWords = words.length;

  if (totalWords < 80) {
    return {
      checkId: "content_excessive_repetition",
      category: "content",
      name: "Repetition & Keyword Density",
      status: "not_checked",
      severity: "none",
      explanation: `Text sample is too small (${totalWords} words) to reliably evaluate word repetition. Minimum 80 words required.`,
      evidence: {
        totalWords,
      },
      recommendation: null,
    };
  }

  // Count non-stop-word frequencies
  const frequencies = new Map<string, number>();
  for (const word of words) {
    if (word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)) {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }
  }

  const sortedTerms: RepeatedTerm[] = Array.from(frequencies.entries())
    .map(([word, count]) => ({
      word,
      count,
      frequencyPercent: Math.round((count / totalWords) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const topRepeatedWords = sortedTerms.slice(0, 5);
  const highest = topRepeatedWords[0];

  const evidence = {
    totalWords,
    uniqueContentWordsCount: frequencies.size,
    topRepeatedWords,
    maxFrequencyPercent: highest ? highest.frequencyPercent : 0,
  };

  if (highest && highest.frequencyPercent >= 12 && highest.count >= 6) {
    return {
      checkId: "content_excessive_repetition",
      category: "content",
      name: "Repetition & Keyword Density",
      status: "fail",
      severity: "critical",
      explanation: `Severe keyword repetition detected: the word "${highest.word}" appears ${highest.count} times (${highest.frequencyPercent}% of all words), indicating potential keyword stuffing.`,
      evidence,
      recommendation: `Reduce unnatural repetition of "${highest.word}". Use synonyms and natural language variations.`,
    };
  }

  if (highest && highest.frequencyPercent >= 7.5 && highest.count >= 6) {
    return {
      checkId: "content_excessive_repetition",
      category: "content",
      name: "Repetition & Keyword Density",
      status: "warning",
      severity: "warning",
      explanation: `High repetition detected for the term "${highest.word}" (${highest.count} occurrences, ${highest.frequencyPercent}% of all words).`,
      evidence,
      recommendation: `Consider diversifying phrasing to avoid repetitive over-emphasis of "${highest.word}".`,
    };
  }

  return {
    checkId: "content_excessive_repetition",
    category: "content",
    name: "Repetition & Keyword Density",
    status: "pass",
    severity: "none",
    explanation: `Natural term distribution observed without abnormal repetition (top non-stop term "${highest?.word || "N/A"}" accounts for ${highest?.frequencyPercent || 0}% of words).`,
    evidence,
    recommendation: null,
  };
}
