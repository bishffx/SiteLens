import type { ContentCheckResult } from "../types";

/**
 * Evaluates the balance between visual images and textual body content.
 */
export function checkImageTextBalance(imageCount: number, wordCount: number): ContentCheckResult {
  if (imageCount === 0 && wordCount < 50) {
    return {
      checkId: "content_image_text_balance",
      category: "content",
      name: "Image & Text Balance",
      status: "not_checked",
      severity: "none",
      explanation: "Insufficient content (under 50 words and zero images) to evaluate media balance.",
      evidence: {
        imageCount,
        wordCount,
        wordsPerImage: null,
      },
      recommendation: null,
    };
  }

  const wordsPerImage = imageCount > 0 ? Math.round(wordCount / imageCount) : null;

  const evidence = {
    imageCount,
    wordCount,
    wordsPerImage,
  };

  if (imageCount === 0 && wordCount > 1200) {
    return {
      checkId: "content_image_text_balance",
      category: "content",
      name: "Image & Text Balance",
      status: "warning",
      severity: "warning",
      explanation: `Long-form text document (${wordCount.toLocaleString()} words) contains zero supporting images, diagrams, or visual dividers.`,
      evidence,
      recommendation: "Introduce relevant illustrations, diagrams, screenshots, or infographics to break up lengthy text blocks and assist comprehension.",
    };
  }

  if (imageCount >= 8 && wordCount < 100) {
    return {
      checkId: "content_image_text_balance",
      category: "content",
      name: "Image & Text Balance",
      status: "warning",
      severity: "warning",
      explanation: `Image-heavy presentation (${imageCount} images) with minimal accompanying text (${wordCount} words). Critical information may be embedded inside images rather than crawlable text.`,
      evidence,
      recommendation: "Ensure key product details, instructions, and messages are rendered in accessible, searchable text rather than flat images.",
    };
  }

  return {
    checkId: "content_image_text_balance",
    category: "content",
    name: "Image & Text Balance",
    status: "pass",
    severity: "none",
    explanation: `Harmonious media balance: ${wordCount.toLocaleString()} words accompanied by ${imageCount} image${imageCount === 1 ? "" : "s"}${wordsPerImage !== null ? ` (~${wordsPerImage} words per image)` : ""}.`,
    evidence,
    recommendation: null,
  };
}
