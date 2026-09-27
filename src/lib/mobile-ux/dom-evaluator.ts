/**
 * Browser-side DOM measurement and evaluation script.
 * Executed directly inside the Playwright Chromium page context.
 */

export interface BrowserMeasuredData {
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  hasHorizontalOverflow: boolean;
  horizontalOverflowPx: number;
  overflowingElements: Array<{
    selector: string;
    tagName: string;
    right: number;
    width: number;
    overflowPx: number;
    htmlSnippet: string;
  }>;
  tapTargets: {
    totalEvaluated: number;
    undersizedCount: number;
    crowdedCount: number;
    sampleUndersized: Array<{
      selector: string;
      tagName: string;
      text: string;
      width: number;
      height: number;
    }>;
  };
  typography: {
    minimumFontSizePx: number | null;
    smallFontElementsCount: number;
    sampleSmallFonts: Array<{
      selector: string;
      fontSizePx: number;
      text: string;
    }>;
  };
  layoutStability: {
    imagesWithoutDimensionsCount: number;
    sampleMissingDimensions: Array<{
      src: string;
      selector: string;
    }>;
  };
  navigation: {
    hasNavLandmark: boolean;
    hasMobileToggle: boolean;
    navElementsCount: number;
    toggleDetails?: {
      selector: string;
      hasAriaExpanded: boolean;
    };
  };
  interactionIntegrity: {
    brokenHrefsCount: number;
    formsMissingSubmitCount: number;
    sampleBrokenControls: Array<{
      tagName: string;
      selector: string;
      reason: string;
    }>;
  };
}

/**
 * Self-contained evaluation function injected into the page via page.evaluate().
 */
export function evaluateBrowserDom(): BrowserMeasuredData {
  const innerWidth = window.innerWidth;
  const innerHeight = window.innerHeight;
  const scrollWidth = document.documentElement.scrollWidth;
  const scrollHeight = document.documentElement.scrollHeight;

  const hasHorizontalOverflow = scrollWidth > innerWidth + 1.5;
  const horizontalOverflowPx = hasHorizontalOverflow ? Math.max(0, scrollWidth - innerWidth) : 0;

  // Helper: generates human-readable CSS selector
  function getCssSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    let selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === "string") {
      const classes = el.className
        .trim()
        .split(/\s+/)
        .filter((c) => c && !c.includes(":") && !c.includes("/") && !c.includes("[") && c.length < 30)
        .slice(0, 2);
      if (classes.length > 0) {
        selector += "." + classes.join(".");
      }
    }
    return selector;
  }

  // 1. Find Horizontal Overflow Elements
  const overflowingElements: BrowserMeasuredData["overflowingElements"] = [];
  if (hasHorizontalOverflow) {
    const all = document.querySelectorAll("body *");
    for (let i = 0; i < all.length && overflowingElements.length < 5; i++) {
      const el = all[i];
      const rect = el.getBoundingClientRect();
      if (rect.right > innerWidth + 2 && rect.width > 0 && rect.height > 0) {
        overflowingElements.push({
          selector: getCssSelector(el),
          tagName: el.tagName.toLowerCase(),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          overflowPx: Math.round(rect.right - innerWidth),
          htmlSnippet: el.outerHTML.slice(0, 120),
        });
      }
    }
  }

  // 2. Measure Tap Target Sizes & Proximity
  const interactiveSelector = "a, button, input:not([type='hidden']), select, textarea, [role='button'], [role='link']";
  const interactives = Array.from(document.querySelectorAll(interactiveSelector));

  let totalEvaluated = 0;
  const undersized: BrowserMeasuredData["tapTargets"]["sampleUndersized"] = [];
  let crowdedCount = 0;

  const visibleTargets: Array<{ el: Element; rect: DOMRect; selector: string }> = [];

  for (const el of interactives) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      parseFloat(style.opacity || "1") > 0.05
    ) {
      totalEvaluated++;
      const selector = getCssSelector(el);
      visibleTargets.push({ el, rect, selector });

      // Check minimum dimensions (WCAG recommended 44x44px for primary mobile tap targets, minimum 24px)
      if (rect.width < 40 || rect.height < 40) {
        if (undersized.length < 6) {
          undersized.push({
            selector,
            tagName: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    }
  }

  // Check tap target proximity (overlap / distance < 8px)
  for (let i = 0; i < visibleTargets.length; i++) {
    for (let j = i + 1; j < visibleTargets.length; j++) {
      const a = visibleTargets[i].rect;
      const b = visibleTargets[j].rect;

      const horizontalDist = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const verticalDist = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));

      if (horizontalDist < 8 && verticalDist < 8) {
        crowdedCount++;
        break;
      }
    }
  }

  // 3. Inspect Font Size Legibility on Viewport
  const textElements = Array.from(
    document.querySelectorAll("p, span, a, li, button, label, h1, h2, h3, h4, h5, h6")
  );

  let smallFontCount = 0;
  let minFontSize: number | null = null;
  const sampleSmallFonts: BrowserMeasuredData["typography"]["sampleSmallFonts"] = [];

  for (const el of textElements) {
    const text = (el.textContent || "").trim();
    if (!text || text.length < 3) continue;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const sizePx = parseFloat(style.fontSize || "16");
    if (!isNaN(sizePx) && sizePx > 0) {
      if (minFontSize === null || sizePx < minFontSize) {
        minFontSize = sizePx;
      }

      if (sizePx < 12) {
        smallFontCount++;
        if (sampleSmallFonts.length < 5) {
          sampleSmallFonts.push({
            selector: getCssSelector(el),
            fontSizePx: Math.round(sizePx * 10) / 10,
            text: text.slice(0, 40),
          });
        }
      }
    }
  }

  // 4. Layout Stability: Images & Iframes Missing Explicit Dimensions
  const mediaElements = Array.from(document.querySelectorAll("img, iframe"));
  let imagesWithoutDimensionsCount = 0;
  const sampleMissingDimensions: BrowserMeasuredData["layoutStability"]["sampleMissingDimensions"] = [];

  for (const media of mediaElements) {
    const hasWidthAttr = media.hasAttribute("width");
    const hasHeightAttr = media.hasAttribute("height");
    const style = window.getComputedStyle(media);
    const hasAspectRatio = style.aspectRatio && style.aspectRatio !== "auto";

    if ((!hasWidthAttr || !hasHeightAttr) && !hasAspectRatio) {
      imagesWithoutDimensionsCount++;
      if (sampleMissingDimensions.length < 5) {
        sampleMissingDimensions.push({
          src: media.getAttribute("src") || "",
          selector: getCssSelector(media),
        });
      }
    }
  }

  // 5. Navigation Accessibility & Mobile Menus
  const navLandmarks = document.querySelectorAll("nav, [role='navigation']");
  const hasNavLandmark = navLandmarks.length > 0;

  // Search for mobile menu toggles
  const potentialToggles = Array.from(
    document.querySelectorAll(
      "button, [role='button'], a[aria-expanded], [aria-label*='menu' i], [class*='hamburger' i], [class*='nav-toggle' i]"
    )
  );

  let hasMobileToggle = false;
  let toggleDetails: BrowserMeasuredData["navigation"]["toggleDetails"] | undefined = undefined;

  for (const t of potentialToggles) {
    const label = (t.getAttribute("aria-label") || t.textContent || t.className || "").toLowerCase();
    if (
      label.includes("menu") ||
      label.includes("hamburger") ||
      label.includes("nav-toggle") ||
      t.hasAttribute("aria-expanded")
    ) {
      hasMobileToggle = true;
      toggleDetails = {
        selector: getCssSelector(t),
        hasAriaExpanded: t.hasAttribute("aria-expanded"),
      };
      break;
    }
  }

  // 6. Interaction Controls Integrity
  const links = Array.from(document.querySelectorAll("a"));
  let brokenHrefsCount = 0;
  const sampleBrokenControls: BrowserMeasuredData["interactionIntegrity"]["sampleBrokenControls"] = [];

  for (const a of links) {
    const href = a.getAttribute("href");
    if (href === "" || href === "#" || href?.startsWith("javascript:void(0)")) {
      brokenHrefsCount++;
      if (sampleBrokenControls.length < 5) {
        sampleBrokenControls.push({
          tagName: "a",
          selector: getCssSelector(a),
          reason: `Placeholder or unnavigable href: "${href}"`,
        });
      }
    }
  }

  const forms = Array.from(document.querySelectorAll("form"));
  let formsMissingSubmitCount = 0;
  for (const f of forms) {
    const submitBtn = f.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
    if (!submitBtn) {
      formsMissingSubmitCount++;
      if (sampleBrokenControls.length < 5) {
        sampleBrokenControls.push({
          tagName: "form",
          selector: getCssSelector(f),
          reason: "Form missing explicit submit button control",
        });
      }
    }
  }

  return {
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    scrollWidth,
    scrollHeight,
    hasHorizontalOverflow,
    horizontalOverflowPx,
    overflowingElements,
    tapTargets: {
      totalEvaluated,
      undersizedCount: undersized.length > 0 ? interactives.length : 0, // normalized later
      crowdedCount,
      sampleUndersized: undersized,
    },
    typography: {
      minimumFontSizePx: minFontSize !== null ? Math.round(minFontSize * 10) / 10 : null,
      smallFontElementsCount: smallFontCount,
      sampleSmallFonts,
    },
    layoutStability: {
      imagesWithoutDimensionsCount,
      sampleMissingDimensions,
    },
    navigation: {
      hasNavLandmark,
      hasMobileToggle,
      navElementsCount: navLandmarks.length,
      toggleDetails,
    },
    interactionIntegrity: {
      brokenHrefsCount,
      formsMissingSubmitCount,
      sampleBrokenControls,
    },
  };
}
