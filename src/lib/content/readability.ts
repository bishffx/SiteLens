/**
 * Readability and Text Statistics Engine for SiteLens AI.
 * Deterministic implementation of Flesch Reading Ease and Flesch-Kincaid Grade Level.
 */

import type { ReadabilityMetrics } from "./types";

/**
 * Common English abbreviations to prevent erroneous sentence boundary splits.
 */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "vs",
  "etc",
  "inc",
  "ltd",
  "co",
  "corp",
  "e.g",
  "i.e",
  "u.s",
  "u.k",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]);

/**
 * Splits plain text into sentences using punctuation boundaries while respecting abbreviations.
 */
export function extractSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize whitespace
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  // Match sentence boundary candidates: followed by space and uppercase letter or end of string
  const rawSegments = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/);
  const sentences: string[] = [];

  let currentBuffer = "";

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i].trim();
    if (!segment) continue;

    if (currentBuffer) {
      currentBuffer += " " + segment;
    } else {
      currentBuffer = segment;
    }

    // Check if current buffer ends with an abbreviation
    const lastWordMatch = currentBuffer.match(/\b([A-Za-z.]+)\s*$/);
    const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase().replace(/\.$/, "") : "";

    if (ABBREVIATIONS.has(lastWord) && i < rawSegments.length - 1) {
      // Abbreviation detected; merge with next segment
      continue;
    }

    // Check if buffer has valid sentence length
    if (currentBuffer.length > 0) {
      sentences.push(currentBuffer);
      currentBuffer = "";
    }
  }

  if (currentBuffer.trim().length > 0) {
    sentences.push(currentBuffer.trim());
  }

  return sentences.filter((s) => s.length > 0);
}

/**
 * Extracts alphanumeric words from text.
 */
export function extractWords(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b[A-Za-z0-9]+(?:'[A-Za-z]+)?\b/g);
  return matches || [];
}

/**
 * Estimates the number of syllables in an English word using deterministic linguistic rules.
 */
export function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  // Syllable counting rules:
  // 1. Count vowel groups
  let formatted = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, "")
    .replace(/^y/, "");

  const vowelGroups = formatted.match(/[aeiouy]{1,2}/g);
  let count = vowelGroups ? vowelGroups.length : 0;

  // Handle words ending in 'le' preceded by a consonant (e.g. "little", "bottle", "table")
  if (/[bcdfghjklmnpqrstvwxyz]le$/.test(clean)) {
    count++;
  }

  // Ensure every valid word has at least 1 syllable
  return Math.max(count, 1);
}

/**
 * Returns descriptive reading comfort bracket for a Flesch Reading Ease score.
 */
export function getReadingEaseLabel(score: number): string {
  if (score >= 90) return "Very Easy (approx. 5th grade level)";
  if (score >= 80) return "Easy (approx. 6th grade level)";
  if (score >= 70) return "Fairly Easy (approx. 7th grade level)";
  if (score >= 60) return "Standard / Plain English (approx. 8th–9th grade level)";
  if (score >= 50) return "Fairly Difficult (approx. 10th–12th grade level)";
  if (score >= 30) return "Difficult (College undergraduate level)";
  return "Very Difficult (Academic / Graduate level)";
}

/**
 * Calculates Flesch Reading Ease and Flesch-Kincaid Grade Level.
 * Returns null if the text sample is insufficient (< 40 words or < 2 sentences).
 */
export function calculateReadabilityMetrics(
  text: string,
  language?: string | null
): ReadabilityMetrics | null {
  // If language is declared and is not English, Flesch formulas do not apply
  if (language && !language.toLowerCase().startsWith("en")) {
    return null;
  }

  const sentences = extractSentences(text);
  const words = extractWords(text);

  if (words.length < 40 || sentences.length < 2) {
    return null;
  }

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllablesInWord(word);
  }

  const totalWords = words.length;
  const totalSentences = sentences.length;

  const asl = totalWords / totalSentences; // Average Sentence Length
  const asw = totalSyllables / totalWords; // Average Syllables per Word

  // Flesch Reading Ease formula: 206.835 - 1.015 * ASL - 84.6 * ASW
  const rawEase = 206.835 - 1.015 * asl - 84.6 * asw;
  const fleschReadingEase = Math.round(Math.max(0, Math.min(100, rawEase)) * 10) / 10;

  // Flesch-Kincaid Grade Level formula: 0.39 * ASL + 11.8 * ASW - 15.59
  const rawGrade = 0.39 * asl + 11.8 * asw - 15.59;
  const fleschKincaidGradeLevel = Math.round(Math.max(0, rawGrade) * 10) / 10;

  return {
    fleschReadingEase,
    fleschKincaidGradeLevel,
    readingEaseLabel: getReadingEaseLabel(fleschReadingEase),
    totalWords,
    totalSentences,
    totalSyllables,
    averageWordsPerSentence: Math.round(asl * 10) / 10,
    averageSyllablesPerWord: Math.round(asw * 100) / 100,
  };
}
