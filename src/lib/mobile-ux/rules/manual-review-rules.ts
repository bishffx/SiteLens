import type { MobileUXFinding } from "../types";

/**
 * Generates structured manual-review recommendations for mobile and UX dimensions.
 * Context-dependent usability aspects that cannot be 100% deterministically verified by automated crawlers.
 */
export function generateManualReviewFindings(): MobileUXFinding[] {
  return [
    {
      id: "manual_review_touch_gestures",
      type: "manual_review",
      category: "mobile",
      title: "Physical Touchscreen Gesture Validation",
      status: "not_checked",
      severity: "info",
      explanation: "Automated browser runners cannot physically test multi-touch gestures, scroll bounce dynamics, or thumb reachability across varying mobile screen form factors.",
      evidence: {
        reviewTopic: "Touch Gestures & Thumb Reachability",
      },
      recommendation: "Test key conversion and navigation paths on physical iOS and Android hardware to verify smooth carousel swiping, pull-to-refresh ergonomics, and one-handed thumb comfort.",
    },
    {
      id: "manual_review_mobile_drawer_focus",
      type: "manual_review",
      category: "ux",
      title: "Modal & Drawer Focus Trapping Verification",
      status: "not_checked",
      severity: "info",
      explanation: "Dynamic slide-out navigation menus, bottom sheets, and promotional dialogs require manual verification to confirm that focus is properly trapped and that backdrop taps close the overlay.",
      evidence: {
        reviewTopic: "Modal & Drawer Focus Trapping",
      },
      recommendation: "Confirm that opening mobile overlays immediately moves focus to the first interactive item, prevents background scrolling, and closes seamlessly on backdrop taps or Escape.",
    },
    {
      id: "manual_review_hover_parity",
      type: "manual_review",
      category: "ux",
      title: "Mouse-Hover to Touch-Tap Feature Parity",
      status: "not_checked",
      severity: "info",
      explanation: "UI components relying on desktop :hover states (such as navigation dropdowns, tooltips, or product card actions) may fail silently or require double-taps on mobile devices.",
      evidence: {
        reviewTopic: "Desktop Hover to Touch Interaction Parity",
      },
      recommendation: "Ensure all desktop hover menus and tooltips offer explicit tap/click triggers on touchscreens without requiring ambiguous multi-taps.",
    },
  ];
}
