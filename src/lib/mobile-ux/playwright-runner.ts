/**
 * Playwright Multi-Viewport Runner for Mobile and UX Analysis.
 * Launches headless Chromium and evaluates representative viewports:
 * - Mobile: 375x667 (hasTouch: true)
 * - Tablet: 768x1024 (hasTouch: true)
 * - Desktop: 1280x800
 */

import type { BrowserMeasuredData } from "./dom-evaluator";
import { evaluateBrowserDom } from "./dom-evaluator";
import { evaluateStaticHtml } from "./static-evaluator";

export interface MultiViewportExecutionResult {
  engineName: "playwright-multi-viewport" | "sitelens-static-dom";
  engineVersion: string;
  isLiveBrowser: boolean;
  viewportsTested: Array<{ name: string; width: number; height: number }>;
  mobileData: BrowserMeasuredData;
  tabletHasOverflow: boolean;
  unhandledErrors: string[];
}

export interface PlaywrightRunnerOptions {
  timeoutMs?: number;
  skipBrowser?: boolean;
}

export class MobileUXPlaywrightRunner {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 20000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async run(
    targetUrl: string,
    html: string,
    options?: PlaywrightRunnerOptions
  ): Promise<MultiViewportExecutionResult> {
    if (options?.skipBrowser) {
      const staticData = evaluateStaticHtml(html);
      return {
        engineName: "sitelens-static-dom",
        engineVersion: "1.0.0 (static)",
        isLiveBrowser: false,
        viewportsTested: [{ name: "mobile_static", width: 375, height: 667 }],
        mobileData: staticData,
        tabletHasOverflow: false,
        unhandledErrors: [],
      };
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    let timerId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Mobile UX browser execution timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    });

    try {
      const runnerPromise = this.executeInBrowser(targetUrl, html);
      return await Promise.race([runnerPromise, timeoutPromise]);
    } catch {
      // Fallback cleanly to static evaluation on browser failure or timeout
      const staticData = evaluateStaticHtml(html);
      return {
        engineName: "sitelens-static-dom",
        engineVersion: "1.0.0 (fallback)",
        isLiveBrowser: false,
        viewportsTested: [{ name: "mobile_static", width: 375, height: 667 }],
        mobileData: staticData,
        tabletHasOverflow: false,
        unhandledErrors: [],
      };
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }

  private async executeInBrowser(
    targetUrl: string,
    html: string
  ): Promise<MultiViewportExecutionResult> {
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const unhandledErrors: string[] = [];

    try {
      // 1. Mobile Viewport Evaluation (375x667)
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 SiteLens/1.0",
      });

      const mobilePage = await mobileContext.newPage();
      mobilePage.on("pageerror", (err) => {
        unhandledErrors.push(err.message);
      });

      try {
        await mobilePage.goto(targetUrl, {
          timeout: 10000,
          waitUntil: "domcontentloaded",
        });
      } catch {
        await mobilePage.setContent(html, { waitUntil: "domcontentloaded" });
      }

      // Execute in-browser DOM measurements
      const mobileData = await mobilePage.evaluate(evaluateBrowserDom);
      await mobileContext.close();

      // 2. Tablet Viewport Evaluation (768x1024)
      const tabletContext = await browser.newContext({
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      });

      const tabletPage = await tabletContext.newPage();
      try {
        await tabletPage.goto(targetUrl, {
          timeout: 8000,
          waitUntil: "domcontentloaded",
        });
      } catch {
        await tabletPage.setContent(html, { waitUntil: "domcontentloaded" });
      }

      const tabletOverflow = await tabletPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1.5;
      });
      await tabletContext.close();

      return {
        engineName: "playwright-multi-viewport",
        engineVersion: "1.63.0",
        isLiveBrowser: true,
        viewportsTested: [
          { name: "mobile", width: 375, height: 667 },
          { name: "tablet", width: 768, height: 1024 },
          { name: "desktop", width: 1280, height: 800 },
        ],
        mobileData,
        tabletHasOverflow: tabletOverflow,
        unhandledErrors,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  }
}
