/**
 * Crawler engine interfaces, data structures, and collection contracts.
 */

export type DeviceType = "desktop" | "mobile";

export interface ViewportSettings {
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
}

export interface CrawlOptions {
  timeoutMs?: number;
  userAgent?: string;
  viewport?: ViewportSettings;
  deviceType?: DeviceType;
  maxPayloadBytes?: number;
  waitForNetworkIdle?: boolean;
  maxDepth?: number;
  maxPages?: number;
  followInternalLinks?: boolean;
  captureScreenshots?: boolean;
}

export interface CrawlJobResult {
  jobId: string;
  rootUrl: string;
  startedAt: string;
  completedAt: string;
  pagesCrawled: number;
  pages: CrawledPageData[];
  errors: string[];
}

export interface RedirectHop {
  url: string;
  status: number;
}

export interface ExtractedHeading {
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text: string;
}

export interface ExtractedLink {
  href: string;
  text: string;
  isInternal: boolean;
  rel: string | null;
  target: string | null;
}

export interface ExtractedImage {
  src: string;
  alt: string | null;
  loading: string | null;
  width: number | null;
  height: number | null;
}

export interface RobotsInfo {
  metaRobots: string | null;
  directives: string[];
}

export interface ViewportInfo {
  metaViewport: string | null;
  hasWidthDeviceWidth: boolean;
  hasInitialScale: boolean;
  userScalableDisabled: boolean;
}

export interface StructuredDataEntry {
  type: string;
  rawJson: string;
  parsed: unknown | null;
  isValidJson: boolean;
}

export interface ResourceInfo {
  scripts: Array<{
    src: string | null;
    isAsync: boolean;
    isDefer: boolean;
    isModule: boolean;
  }>;
  stylesheets: Array<{
    href: string | null;
  }>;
  totalScriptsCount: number;
  totalStylesheetsCount: number;
  totalImagesCount: number;
}

export interface BasicPageTiming {
  dnsLookupMs: number | null;
  tcpConnectMs: number | null;
  tlsHandshakeMs: number | null;
  timeToFirstByteMs: number | null;
  domContentLoadedMs: number | null;
  loadCompleteMs: number;
}

export interface CrawlerLogEntry {
  source: "console" | "network" | "page";
  message: string;
  timestamp: string;
}

/**
 * Standardized single-page structured crawl outcome.
 * Every field accurately represents what was found, or is null/empty if missing.
 */
export interface SinglePageCrawlResult {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number | null;
  statusText: string | null;
  pageTitle: string | null;
  html: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
    all: ExtractedHeading[];
  };
  links: ExtractedLink[];
  images: ExtractedImage[];
  robots: RobotsInfo;
  viewport: ViewportInfo;
  language: string | null;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  structuredData: StructuredDataEntry[];
  textContent: string;
  resources: ResourceInfo;
  timing: BasicPageTiming;
  redirectChain: RedirectHop[];
  headers: Record<string, string>;
  isJavaScriptRendered: boolean;
  capturedAt: string;
  errors: CrawlerLogEntry[];
}

/**
 * Compatible bridge interface for analysis pipeline.
 */
export interface CrawledPageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  html: string;
  textContent: string;
  headers: Record<string, string>;
  timing: {
    dnsLookupTimeMs: number;
    tcpConnectTimeMs: number;
    tlsHandshakeTimeMs: number;
    timeToFirstByteMs: number;
    domContentLoadedTimeMs: number;
    loadCompleteTimeMs: number;
  };
  pageTitle: string;
  links: string[];
  resources: {
    scripts: string[];
    stylesheets: string[];
    images: Array<{
      src: string;
      alt?: string;
      loading?: string;
      naturalWidth?: number;
      naturalHeight?: number;
    }>;
  };
  errors: Array<{
    source: "console" | "network" | "page";
    message: string;
    timestamp: number;
  }>;
}
