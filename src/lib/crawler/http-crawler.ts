import { extractHtmlData } from "./html-extractor";
import type {
  CrawlOptions,
  RedirectHop,
  SinglePageCrawlResult,
} from "../types/crawler";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export class HttpCrawler {
  async crawl(
    targetUrl: string,
    options: CrawlOptions = {}
  ): Promise<SinglePageCrawlResult> {
    // Validate URL against SSRF and private network risks
    const { isUrlSafe } = await import('../utils/url-validators');
    if (!isUrlSafe(targetUrl)) {
      throw new Error('Unsafe URL blocked by security policy');
    }
    const timeoutMs = options.timeoutMs || 25000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const redirectChain: RedirectHop[] = [];
    const startTime = Date.now();

    const userAgent =
      options.userAgent ||
      (options.deviceType === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SiteLens/1.0"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 SiteLens/1.0");

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      const loadCompleteMs = Date.now() - startTime;
      let html = await response.text();

      if (Buffer.byteLength(html, "utf8") > MAX_PAYLOAD_BYTES) {
        html = html.slice(0, MAX_PAYLOAD_BYTES);
      }

      const finalUrl = response.url || targetUrl;
      const headers: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headers[key] = val;
      });

      const extracted = extractHtmlData(html, finalUrl);

      return {
        requestedUrl: targetUrl,
        finalUrl,
        httpStatus: response.status,
        statusText: response.statusText,
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
          dnsLookupMs: null,
          tcpConnectMs: null,
          tlsHandshakeMs: null,
          timeToFirstByteMs: null,
          domContentLoadedMs: null,
          loadCompleteMs,
        },
        redirectChain,
        headers,
        isJavaScriptRendered: false,
        capturedAt: new Date().toISOString(),
        errors: [],
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const defaultHttpCrawler = new HttpCrawler();
