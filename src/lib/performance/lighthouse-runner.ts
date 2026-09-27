/**
 * Robust Lighthouse Runner for SiteLens AI.
 * Handles timeouts, dynamic environment support, Windows temp file permissions,
 * and extracts raw performance audit data safely.
 */

export interface LighthouseExecutionResult {
  isAvailable: boolean;
  version: string | null;
  error: string | null;
  performanceScore: number | null;
  rawLhr: Record<string, unknown> | null;
  metrics: {
    fcpMs: number | null;
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    inpMs: number | null;
    speedIndexMs: number | null;
    totalByteWeight: number | null;
  };
  details: {
    renderBlockingResourcesCount: number | null;
    unsizedImagesCount: number | null;
    domElementCount: number | null;
  };
}

export interface LighthouseRunnerOptions {
  timeoutMs?: number;
  chromeFlags?: string[];
  emulatedFormFactor?: "mobile" | "desktop";
}

export class LighthouseRunner {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 30000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Executes a Lighthouse audit on targetUrl if the environment supports it.
   * If Lighthouse cannot run, fails, or times out, returns an explicit unavailable result.
   */
  async runAudit(
    targetUrl: string,
    options?: LighthouseRunnerOptions
  ): Promise<LighthouseExecutionResult> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const formFactor = options?.emulatedFormFactor ?? "desktop";

    // Set up timeout promise
    let timerId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Lighthouse analysis timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    });

    try {
      const auditPromise = this.executeLighthouse(targetUrl, formFactor, options?.chromeFlags);
      const result = await Promise.race([auditPromise, timeoutPromise]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        isAvailable: false,
        version: null,
        error: errorMessage,
        performanceScore: null,
        rawLhr: null,
        metrics: {
          fcpMs: null,
          lcpMs: null,
          cls: null,
          tbtMs: null,
          inpMs: null,
          speedIndexMs: null,
          totalByteWeight: null,
        },
        details: {
          renderBlockingResourcesCount: null,
          unsizedImagesCount: null,
          domElementCount: null,
        },
      };
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }

  private async executeLighthouse(
    targetUrl: string,
    formFactor: "mobile" | "desktop",
    extraChromeFlags?: string[]
  ): Promise<LighthouseExecutionResult> {
    // 1. Check if lighthouse & chrome-launcher can be imported
    let lighthouseModule: typeof import("lighthouse");
    let chromeLauncherModule: typeof import("chrome-launcher");
    let playwrightModule: typeof import("playwright");

    try {
      lighthouseModule = await import("lighthouse");
      chromeLauncherModule = await import("chrome-launcher");
      playwrightModule = await import("playwright");
    } catch (importErr) {
      return {
        isAvailable: false,
        version: null,
        error: `Lighthouse runtime environment unavailable: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
        performanceScore: null,
        rawLhr: null,
        metrics: {
          fcpMs: null,
          lcpMs: null,
          cls: null,
          tbtMs: null,
          inpMs: null,
          speedIndexMs: null,
          totalByteWeight: null,
        },
        details: {
          renderBlockingResourcesCount: null,
          unsizedImagesCount: null,
          domElementCount: null,
        },
      };
    }

    // 2. Resolve Chrome/Chromium executable path
    let chromePath: string | undefined;
    try {
      chromePath = playwrightModule.chromium.executablePath();
    } catch {
      // Fall back to default chrome-launcher detection
      chromePath = undefined;
    }

    const defaultFlags = [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
    ];
    const chromeFlags = [...defaultFlags, ...(extraChromeFlags || [])];

    // 3. Launch Chrome
    let chrome: Awaited<ReturnType<typeof chromeLauncherModule.launch>> | null = null;
    try {
      chrome = await chromeLauncherModule.launch({
        chromePath,
        chromeFlags,
      });
    } catch (launchErr) {
      return {
        isAvailable: false,
        version: null,
        error: `Failed to launch browser for Lighthouse: ${launchErr instanceof Error ? launchErr.message : String(launchErr)}`,
        performanceScore: null,
        rawLhr: null,
        metrics: {
          fcpMs: null,
          lcpMs: null,
          cls: null,
          tbtMs: null,
          inpMs: null,
          speedIndexMs: null,
          totalByteWeight: null,
        },
        details: {
          renderBlockingResourcesCount: null,
          unsizedImagesCount: null,
          domElementCount: null,
        },
      };
    }

    try {
      // 4. Run Lighthouse audit targeting performance category
      const lh = lighthouseModule.default || lighthouseModule;
      const lhResult = await lh(
        targetUrl,
        {
          port: chrome.port,
          output: "json",
          onlyCategories: ["performance"],
          formFactor,
          screenEmulation:
            formFactor === "desktop"
              ? { disabled: true }
              : undefined,
        }
      );

      if (!lhResult || !lhResult.lhr) {
        throw new Error("Lighthouse returned an empty audit report.");
      }

      const lhr = lhResult.lhr;
      const perfCategory = lhr.categories.performance;
      const performanceScore =
        perfCategory && typeof perfCategory.score === "number"
          ? Math.round(perfCategory.score * 100)
          : null;

      const audits = lhr.audits || {};

      const fcpAudit = audits["first-contentful-paint"];
      const lcpAudit = audits["largest-contentful-paint"];
      const clsAudit = audits["cumulative-layout-shift"];
      const tbtAudit = audits["total-blocking-time"];
      const inpAudit = audits["interaction-to-next-paint"] || audits["inp"];
      const siAudit = audits["speed-index"];
      const byteAudit = audits["total-byte-weight"];
      const renderBlockingAudit = audits["render-blocking-resources"];
      const unsizedImagesAudit = audits["unsized-images"];
      const domSizeAudit = audits["dom-size"];

      return {
        isAvailable: true,
        version: lhr.lighthouseVersion || null,
        error: null,
        performanceScore,
        rawLhr: lhr as unknown as Record<string, unknown>,
        metrics: {
          fcpMs: typeof fcpAudit?.numericValue === "number" ? fcpAudit.numericValue : null,
          lcpMs: typeof lcpAudit?.numericValue === "number" ? lcpAudit.numericValue : null,
          cls: typeof clsAudit?.numericValue === "number" ? clsAudit.numericValue : null,
          tbtMs: typeof tbtAudit?.numericValue === "number" ? tbtAudit.numericValue : null,
          inpMs: typeof inpAudit?.numericValue === "number" ? inpAudit.numericValue : null,
          speedIndexMs: typeof siAudit?.numericValue === "number" ? siAudit.numericValue : null,
          totalByteWeight: typeof byteAudit?.numericValue === "number" ? byteAudit.numericValue : null,
        },
        details: {
          renderBlockingResourcesCount: Array.isArray(
            (renderBlockingAudit?.details as { items?: unknown[] } | undefined)?.items
          )
            ? ((renderBlockingAudit?.details as { items: unknown[] }).items.length)
            : null,
          unsizedImagesCount: Array.isArray(
            (unsizedImagesAudit?.details as { items?: unknown[] } | undefined)?.items
          )
            ? ((unsizedImagesAudit?.details as { items: unknown[] }).items.length)
            : null,
          domElementCount:
            typeof domSizeAudit?.numericValue === "number" ? domSizeAudit.numericValue : null,
        },
      };
    } finally {
      // 5. Cleanup Chrome process safely
      if (chrome) {
        try {
          await chrome.kill();
        } catch {
          // On Windows, temp folder deletion handle can trigger EPERM, safely catch
        }
      }
    }
  }
}

export const defaultLighthouseRunner = new LighthouseRunner();
