import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates layout stability signals (missing width/height attributes on media).
 * Measured issue classification.
 */
export function checkLayoutStability(
  stabilityData: BrowserMeasuredData["layoutStability"]
): MobileUXFinding {
  const { imagesWithoutDimensionsCount, sampleMissingDimensions } = stabilityData;

  if (imagesWithoutDimensionsCount > 0) {
    return {
      id: "ux_layout_shift_dimensions",
      type: "measured",
      category: "ux",
      title: "Visual Layout Stability & CLS Risk",
      status: "warning",
      severity: "warning",
      explanation: `Found ${imagesWithoutDimensionsCount} image(s) or media element(s) without explicit width and height dimensions or CSS aspect-ratio. When these media download, they cause sudden cumulative layout shifts.`,
      evidence: {
        imagesWithoutDimensionsCount,
        sampleNodes: sampleMissingDimensions.map((m) => ({
          selector: m.selector,
          details: `Source: ${m.src.slice(0, 80)}`,
        })),
      },
      recommendation: "Provide explicit width and height HTML attributes on all <img> and <iframe> elements, or define a CSS aspect-ratio, so browsers can reserve layout space before downloading.",
    };
  }

  return {
    id: "ux_layout_shift_dimensions",
    type: "measured",
    category: "ux",
    title: "Visual Layout Stability & CLS Risk",
    status: "pass",
    severity: "none",
    explanation: "Images and embedded media have explicit dimensions or aspect-ratios, preventing unexpected cumulative layout shifts.",
    evidence: {
      imagesWithoutDimensionsCount: 0,
    },
    recommendation: null,
  };
}
