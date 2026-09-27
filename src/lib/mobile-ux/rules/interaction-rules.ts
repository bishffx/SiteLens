import type { MobileUXFinding } from "../types";
import type { BrowserMeasuredData } from "../dom-evaluator";

/**
 * Evaluates obvious interaction failures (broken links, missing form submit, runtime exceptions).
 * Measured issue classification.
 */
export function checkInteractionIntegrity(
  integrityData: BrowserMeasuredData["interactionIntegrity"],
  unhandledErrors: string[] = []
): MobileUXFinding {
  const { brokenHrefsCount, formsMissingSubmitCount, sampleBrokenControls } = integrityData;

  const totalDefects = brokenHrefsCount + formsMissingSubmitCount + unhandledErrors.length;

  if (unhandledErrors.length > 0) {
    return {
      id: "ux_runtime_interaction_errors",
      type: "measured",
      category: "ux",
      title: "Interactive Runtime Errors",
      status: "fail",
      severity: "critical",
      explanation: `Detected ${unhandledErrors.length} unhandled JavaScript exception${unhandledErrors.length === 1 ? "" : "s"} during page loading and interaction. Runtime errors can break user flows.`,
      evidence: {
        unhandledErrorsCount: unhandledErrors.length,
        errors: unhandledErrors.slice(0, 3),
      },
      recommendation: "Inspect browser console logs and resolve uncaught script exceptions in production bundles.",
    };
  }

  if (brokenHrefsCount > 0 || formsMissingSubmitCount > 0) {
    return {
      id: "ux_interaction_control_defects",
      type: "measured",
      category: "ux",
      title: "Interactive Controls Integrity",
      status: "warning",
      severity: "warning",
      explanation: `Found ${brokenHrefsCount} unnavigable or placeholder link(s) (e.g. href="#" or empty href) and ${formsMissingSubmitCount} form(s) lacking an explicit submit button.`,
      evidence: {
        brokenHrefsCount,
        formsMissingSubmitCount,
        sampleNodes: sampleBrokenControls.map((c) => ({
          selector: c.selector,
          details: c.reason,
        })),
      },
      recommendation: "Ensure all hyperlinks navigate to valid destination URLs or are converted to <button> elements with appropriate click event handlers.",
    };
  }

  return {
    id: "ux_interaction_control_defects",
    type: "measured",
    category: "ux",
    title: "Interactive Controls Integrity",
    status: "pass",
    severity: "none",
    explanation: "Interactive controls and links are validly constructed with no unhandled runtime exceptions or placeholder anchors.",
    evidence: {
      brokenHrefsCount: 0,
      formsMissingSubmitCount: 0,
      unhandledErrorsCount: 0,
    },
    recommendation: null,
  };
}
