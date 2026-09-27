import type { ContentCheckResult } from "../types";
import type { ExtractedHeading } from "../../types/crawler";

interface HeadingsContainer {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
  all: ExtractedHeading[];
}

/**
 * Evaluates heading distribution and text-to-heading density.
 */
export function checkHeadingDistribution(
  headings: HeadingsContainer | undefined | null,
  wordCount: number
): ContentCheckResult {
  if (wordCount < 50) {
    return {
      checkId: "content_heading_distribution",
      category: "content",
      name: "Heading Distribution & Density",
      status: "not_checked",
      severity: "none",
      explanation: `Insufficient visible text (${wordCount} words) to meaningfully evaluate heading distribution. Minimum 50 words required.`,
      evidence: {
        wordCount,
        headingCount: headings?.all?.length || 0,
      },
      recommendation: null,
    };
  }

  const allHeadings = headings?.all || [];
  const totalHeadings = allHeadings.length;

  const distribution = {
    h1: headings?.h1?.length || 0,
    h2: headings?.h2?.length || 0,
    h3: headings?.h3?.length || 0,
    h4: headings?.h4?.length || 0,
    h5: headings?.h5?.length || 0,
    h6: headings?.h6?.length || 0,
    total: totalHeadings,
  };

  if (totalHeadings === 0) {
    return {
      checkId: "content_heading_distribution",
      category: "content",
      name: "Heading Distribution & Density",
      status: "warning",
      severity: "warning",
      explanation: "No structural headings (H1–H6) were found on the page to break down and organize the text.",
      evidence: {
        wordCount,
        distribution,
        wordsPerHeading: null,
      },
      recommendation: "Introduce hierarchical headings (H1 for page topic, H2 for major sections, H3 for subsections) to organize content logically.",
    };
  }

  const wordsPerHeading = Math.round(wordCount / totalHeadings);

  if (wordsPerHeading > 400 && totalHeadings < 3) {
    return {
      checkId: "content_heading_distribution",
      category: "content",
      name: "Heading Distribution & Density",
      status: "warning",
      severity: "warning",
      explanation: `High text density per heading (averaging ${wordsPerHeading} words per heading across ${totalHeadings} heading${totalHeadings === 1 ? "" : "s"}). Long continuous text walls can be fatiguing for readers.`,
      evidence: {
        wordCount,
        distribution,
        wordsPerHeading,
      },
      recommendation: "Add descriptive subheadings (H2, H3) every 150–300 words to break up lengthy sections and improve reader scannability.",
    };
  }

  if (wordsPerHeading < 15 && totalHeadings >= 6) {
    return {
      checkId: "content_heading_distribution",
      category: "content",
      name: "Heading Distribution & Density",
      status: "warning",
      severity: "warning",
      explanation: `Unusually dense heading frequency (${totalHeadings} headings for ${wordCount} words, averaging ${wordsPerHeading} words per heading). Headings may be used for presentation styling rather than semantic structure.`,
      evidence: {
        wordCount,
        distribution,
        wordsPerHeading,
      },
      recommendation: "Ensure headings are reserved for structuring substantive sections of text, rather than styling short labels or icon badges.",
    };
  }

  return {
    checkId: "content_heading_distribution",
    category: "content",
    name: "Heading Distribution & Density",
    status: "pass",
    severity: "none",
    explanation: `Headings are well-distributed across the page content (${totalHeadings} headings, averaging ${wordsPerHeading} words per heading).`,
    evidence: {
      wordCount,
      distribution,
      wordsPerHeading,
    },
    recommendation: null,
  };
}
