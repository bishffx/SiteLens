import type { CrawlOptions, CrawledPageData, CrawlJobResult } from "../types/crawler";

/**
 * Interface contract for server-side website crawlers (e.g., Playwright / Puppeteer).
 */
export interface ICrawlerService {
  initialize(): Promise<void>;
  crawlPage(url: string, options?: Partial<CrawlOptions>): Promise<CrawledPageData>;
  crawlSite(rootUrl: string, options?: Partial<CrawlOptions>): Promise<CrawlJobResult>;
  teardown(): Promise<void>;
}
