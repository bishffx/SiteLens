import { defaultPlaywrightCrawler, PlaywrightCrawler } from "./playwright-crawler";
import { defaultHttpCrawler, HttpCrawler } from "./http-crawler";
import { AuditLogger } from "../utils/logger";
import type { CrawlOptions, SinglePageCrawlResult } from "../types/crawler";

const logger = new AuditLogger("CrawlerManager");

export class CrawlerManager {
  private playwrightCrawler: PlaywrightCrawler;
  private httpCrawler: HttpCrawler;

  constructor(
    customPlaywright?: PlaywrightCrawler,
    customHttp?: HttpCrawler
  ) {
    this.playwrightCrawler = customPlaywright || defaultPlaywrightCrawler;
    this.httpCrawler = customHttp || defaultHttpCrawler;
  }

  /**
   * Crawls a single normalized URL.
   * Leverages Playwright for full JS rendering and navigation timing,
   * falling back to HTTP + Cheerio if headless browser is unavailable.
   */
  async crawlSinglePage(
    targetUrl: string,
    options: CrawlOptions = {}
  ): Promise<SinglePageCrawlResult> {
    logger.info(`Initiating single-page crawl for: ${targetUrl}`, {
      deviceType: options.deviceType || "desktop",
    });

    try {
      // Primary: Headless Chromium via Playwright
      const result = await this.playwrightCrawler.crawl(targetUrl, options);
      logger.info(`Playwright crawl completed for ${result.finalUrl}`, {
        status: result.httpStatus,
        loadTimeMs: result.timing.loadCompleteMs,
        title: result.pageTitle,
      });
      return result;
    } catch (playwrightError: unknown) {
      const err = playwrightError as Error;
      logger.warn(
        `Playwright browser crawl failed or timed out (${err.message}). Falling back to HTTP/Cheerio crawl...`
      );

      // Resilient fallback: Standard HTTP + Cheerio parsing
      try {
        const fallbackResult = await this.httpCrawler.crawl(targetUrl, options);
        logger.info(`Fallback HTTP crawl completed for ${fallbackResult.finalUrl}`, {
          status: fallbackResult.httpStatus,
          loadTimeMs: fallbackResult.timing.loadCompleteMs,
        });
        return fallbackResult;
      } catch (fallbackError: unknown) {
        logger.error(`Both Playwright and HTTP crawler failed for ${targetUrl}`, fallbackError);
        throw playwrightError; // rethrow primary error with original diagnostic context
      }
    }
  }

  async close(): Promise<void> {
    await this.playwrightCrawler.close().catch(() => {});
  }
}

export const defaultCrawlerManager = new CrawlerManager();
