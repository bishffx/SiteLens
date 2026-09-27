import type { SEOCheckResult } from "../types";
import type { ExtractedImage } from "../../types/crawler";

export function checkImageAltAttributes(images: ExtractedImage[]): SEOCheckResult {
  if (!images || images.length === 0) {
    return {
      checkId: "seo_image_alt_attributes",
      category: "seo",
      name: "Image Alternative Text (alt)",
      status: "not_checked",
      severity: "none",
      explanation: "No <img> elements discovered on this page.",
      evidence: "0 images found",
      recommendation: null,
    };
  }

  const missingAltImages = images.filter((img) => img.alt === null);
  const total = images.length;
  const missingCount = missingAltImages.length;

  if (missingCount > 0) {
    const severity = missingCount > 3 ? "critical" : "warning";
    return {
      checkId: "seo_image_alt_attributes",
      category: "seo",
      name: "Image Alternative Text (alt)",
      status: missingCount > 3 ? "fail" : "warning",
      severity,
      explanation: `${missingCount} of ${total} image(s) lack an alt attribute entirely.`,
      evidence: {
        missingCount,
        totalImages: total,
        samplesWithoutAlt: missingAltImages.slice(0, 3).map((i) => i.src),
      },
      recommendation: "Provide informative alt text for all content images, or specify alt=\"\" for decorative background imagery.",
    };
  }

  return {
    checkId: "seo_image_alt_attributes",
    category: "seo",
    name: "Image Alternative Text (alt)",
    status: "pass",
    severity: "none",
    explanation: `All ${total} discovered image(s) specify an alt attribute.`,
    evidence: `Total Images: ${total}, Missing: 0`,
    recommendation: null,
  };
}
