import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { extractHtmlData } from "./html-extractor";
import { isUrlSafe } from "../utils/url-validators";
import { AuditLogger } from "../utils/logger";
import { DEFAULT_VIEWPORT_DESKTOP, DEFAULT_VIEWPORT_MOBILE } from "./config";
import type {
  CrawlOptions,
  CrawlerLogEntry,
  RedirectHop,
  SinglePageCrawlResult,
} from "../types/crawler";

const logger = new AuditLogger("PlaywrightCrawler");

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB max response limit
const DEFAULT_TIMEOUT_MS = 25000;

export class PlaywrightCrawler {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
        ],
      });
    }
    return this.browser;
  }

  /**
   * Safely crawls a single normalized URL using headless Chromium and extracts
   * all structured page attributes.
   */
  async crawl(
    targetUrl: string,
    options: CrawlOptions = {}
  ): Promise<SinglePageCrawlResult> {
    const timeoutMs = Math.min(options.timeoutMs || DEFAULT_TIMEOUT_MS, 30000);
    const isMobile = options.deviceType === "mobile";
    const viewport = isMobile ? DEFAULT_VIEWPORT_MOBILE : DEFAULT_VIEWPORT_DESKTOP;
    const userAgent =
      options.userAgent ||
      (isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SiteLens/1.0"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 SiteLens/1.0");

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const redirectChain: RedirectHop[] = [];
    const errors: CrawlerLogEntry[] = [];
    let responseHeaders: Record<string, string> = {};
    let finalHttpStatus: number | null = null;
    let finalStatusText: string | null = null;

    const startTime = Date.now();

    try {
      const browser = await this.getBrowser();
      context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent,
        ignoreHTTPSErrors: false, // strictly enforce SSL verification
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeoutMs);
      page.setDefaultNavigationTimeout(timeoutMs);

      // Track console errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push({
            source: "console",
            message: msg.text().slice(0, 300),
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Track uncaught page errors
      page.on("pageerror", (err) => {
        errors.push({
          source: "page",
          message: (err.message || String(err)).slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      // Track redirects and network responses
      page.on("response", (resp) => {
        const status = resp.status();
        const respUrl = resp.url();

        if (status >= 300 && status < 400) {
          redirectChain.push({ url: respUrl, status });
        }
      });

      // Navigate to target URL
      const response = await page.goto(targetUrl, {
        waitUntil: options.waitForNetworkIdle ? "networkidle" : "domcontentloaded",
        timeout: timeoutMs,
      });

      const loadCompleteMs = Date.now() - startTime;

      if (response) {
        finalHttpStatus = response.status();
        finalStatusText = response.statusText();
        const rawHeaders = response.headers();
        responseHeaders = { ...rawHeaders };
      }

      // Collect Navigation Timing API metrics from page
      const timingMetrics = await page
        .evaluate(() => {
          const nav = performance.getEntriesByType(
            "navigation"
          )[0] as PerformanceNavigationTiming | undefined;
          if (!nav) return null;
          return {
            dnsLookupMs: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
            tcpConnectMs: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
            tlsHandshakeMs:
              nav.secureConnectionStart > 0
                ? Math.max(0, Math.round(nav.connectEnd - nav.secureConnectionStart))
                : null,
            timeToFirstByteMs: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
            domContentLoadedMs: Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime)),
          };
        })
        .catch(() => null);

      // Capture rendered HTML
      let html = await page.content();
      const finalUrl = page.url();

      // Guardrail: check payload size limit (5 MB)
      if (Buffer.byteLength(html, "utf8") > MAX_PAYLOAD_BYTES) {
        logger.warn(`Truncating oversized response (${Buffer.byteLength(html, "utf8")} bytes) for ${finalUrl}`);
        html = html.slice(0, MAX_PAYLOAD_BYTES);
      }

      // Extract all document fields deterministically via Cheerio
      const extracted = extractHtmlData(html, finalUrl);

      return {
        requestedUrl: targetUrl,
        finalUrl,
        httpStatus: finalHttpStatus,
        statusText: finalStatusText,
        pageTitle: extracted.pageTitle,
        html,
        metaDescription: extracted.metaDescription,
        canonicalUrl: extracted.canonicalUrl,
        headings: extracted.headings,
        links: extracted.links,
        images: extracted.images,
        robots: extracted.robots,
        viewport: extracted.viewport,
        language: extracted.language,
        openGraph: extracted.openGraph,
        twitter: extracted.twitter,
        structuredData: extracted.structuredData,
        textContent: extracted.textContent,
        resources: extracted.resources,
        timing: {
          dnsLookupMs: timingMetrics?.dnsLookupMs ?? null,
          tcpConnectMs: timingMetrics?.tcpConnectMs ?? null,
          tlsHandshakeMs: timingMetrics?.tlsHandshakeMs ?? null,
          timeToFirstByteMs: timingMetrics?.timeToFirstByteMs ?? null,
          domContentLoadedMs: timingMetrics?.domContentLoadedMs ?? null,
          loadCompleteMs,
        },
        redirectChain,
        headers: responseHeaders,
        isJavaScriptRendered: true,
        capturedAt: new Date().toISOString(),
        errors,
      };
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const defaultPlaywrightCrawler = new PlaywrightCrawler();
