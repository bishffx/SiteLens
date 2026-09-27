import type { CrawlOptions, ViewportSettings } from "../types/crawler";

export const DEFAULT_VIEWPORT_DESKTOP: ViewportSettings = {
  width: 1440,
  height: 900,
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
};

export const DEFAULT_VIEWPORT_MOBILE: ViewportSettings = {
  width: 390,
  height: 844,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxDepth: 1,
  maxPages: 1,
  timeoutMs: 30000,
  deviceType: "desktop",
  viewport: DEFAULT_VIEWPORT_DESKTOP,
  followInternalLinks: false,
  captureScreenshots: false,
  userAgent: "SiteLens-Audit-Bot/1.0 (+https://sitelens.local/bot)",
};
