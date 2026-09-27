import * as cheerio from "cheerio";
import { resolveUrl, isSameOrigin } from "../utils/url-helpers";
import type {
  ExtractedHeading,
  ExtractedImage,
  ExtractedLink,
  ResourceInfo,
  RobotsInfo,
  StructuredDataEntry,
  ViewportInfo,
} from "../types/crawler";

export interface ParsedHtmlData {
  pageTitle: string | null;
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
}

/**
 * Extracts structured document data from HTML markup using Cheerio.
 * Operates deterministically: never fabricates missing information.
 */
export function extractHtmlData(html: string, baseUrl: string): ParsedHtmlData {
  const $ = cheerio.load(html, {
    xml: false,
  });

  // 1. Page Title
  const rawTitle = $("title").first().text().trim();
  const pageTitle = rawTitle.length > 0 ? rawTitle : null;

  // 2. Language attribute
  const langAttr = $("html").attr("lang")?.trim();
  const language = langAttr && langAttr.length > 0 ? langAttr : null;

  // 3. Meta Description
  const rawDesc =
    $('meta[name="description" i]').attr("content")?.trim() ||
    $('meta[property="description" i]').attr("content")?.trim();
  const metaDescription = rawDesc && rawDesc.length > 0 ? rawDesc : null;

  // 4. Canonical URL
  const rawCanonical = $('link[rel="canonical" i]').attr("href")?.trim();
  const canonicalUrl = rawCanonical
    ? resolveUrl(baseUrl, rawCanonical) || rawCanonical
    : null;

  // 5. Headings Hierarchy
  const headings = {
    h1: [] as string[],
    h2: [] as string[],
    h3: [] as string[],
    h4: [] as string[],
    h5: [] as string[],
    h6: [] as string[],
    all: [] as ExtractedHeading[],
  };

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tagName = el.tagName.toLowerCase() as ExtractedHeading["level"];
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 0) {
      headings[tagName].push(text);
      headings.all.push({ level: tagName, text });
    }
  });

  // 6. Links
  const links: ExtractedLink[] = [];
  const seenHrefs = new Set<string>();

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;

    const resolved = resolveUrl(baseUrl, rawHref) || rawHref;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const rel = $(el).attr("rel")?.trim() || null;
    const target = $(el).attr("target")?.trim() || null;

    const key = `${resolved}|${text}`;
    if (!seenHrefs.has(key)) {
      seenHrefs.add(key);
      links.push({
        href: resolved,
        text,
        isInternal: isSameOrigin(baseUrl, resolved),
        rel,
        target,
      });
    }
  });

  // 7. Images
  const images: ExtractedImage[] = [];
  $("img").each((_, el) => {
    const rawSrc = $(el).attr("src")?.trim() || $(el).attr("data-src")?.trim();
    if (!rawSrc) return;

    const src = resolveUrl(baseUrl, rawSrc) || rawSrc;
    const alt = $(el).attr("alt") !== undefined ? ($(el).attr("alt")?.trim() ?? "") : null;
    const loading = $(el).attr("loading")?.trim() || null;
    const rawWidth = $(el).attr("width");
    const rawHeight = $(el).attr("height");

    const width = rawWidth ? parseInt(rawWidth, 10) : null;
    const height = rawHeight ? parseInt(rawHeight, 10) : null;

    images.push({
      src,
      alt,
      loading,
      width: isNaN(width as number) ? null : width,
      height: isNaN(height as number) ? null : height,
    });
  });

  // 8. Robots information
  const rawRobots = $('meta[name="robots" i]').attr("content")?.trim() || null;
  const robotsDirectives = rawRobots
    ? rawRobots
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const robots: RobotsInfo = {
    metaRobots: rawRobots,
    directives: robotsDirectives,
  };

  // 9. Viewport information
  const rawViewport = $('meta[name="viewport" i]').attr("content")?.trim() || null;
  const viewport: ViewportInfo = {
    metaViewport: rawViewport,
    hasWidthDeviceWidth: rawViewport
      ? /width\s*=\s*device-width/i.test(rawViewport)
      : false,
    hasInitialScale: rawViewport
      ? /initial-scale\s*=\s*1/i.test(rawViewport)
      : false,
    userScalableDisabled: rawViewport
      ? /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?/i.test(rawViewport)
      : false,
  };

  // 10. Open Graph Metadata
  const openGraph: Record<string, string> = {};
  $('meta[property^="og:" i]').each((_, el) => {
    const prop = $(el).attr("property")?.toLowerCase().trim();
    const content = $(el).attr("content")?.trim();
    if (prop && content) {
      openGraph[prop] = content;
    }
  });

  // 11. Twitter Card Metadata
  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:" i], meta[property^="twitter:" i]').each((_, el) => {
    const name = ($(el).attr("name") || $(el).attr("property"))
      ?.toLowerCase()
      .trim();
    const content = $(el).attr("content")?.trim();
    if (name && content) {
      twitter[name] = content;
    }
  });

  // 12. Structured Data (JSON-LD)
  const structuredData: StructuredDataEntry[] = [];
  $('script[type="application/ld+json" i]').each((_, el) => {
    const rawJson = $(el).html()?.trim();
    if (!rawJson) return;

    try {
      const parsed = JSON.parse(rawJson);
      const type =
        typeof parsed === "object" && parsed !== null && "@type" in parsed
          ? String((parsed as Record<string, unknown>)["@type"])
          : "Unknown";

      structuredData.push({
        type,
        rawJson,
        parsed,
        isValidJson: true,
      });
    } catch {
      structuredData.push({
        type: "InvalidJSON",
        rawJson,
        parsed: null,
        isValidJson: false,
      });
    }
  });

  // 13. Text content (strip non-content tags)
  const clone = $.load(html);
  clone("script, style, noscript, svg, template, iframe").remove();
  const textContent = clone("body").text().replace(/\s+/g, " ").trim();

  // 14. Resources (scripts and stylesheets)
  const scripts: ResourceInfo["scripts"] = [];
  $("script").each((_, el) => {
    const src = $(el).attr("src")?.trim() || null;
    scripts.push({
      src: src ? resolveUrl(baseUrl, src) || src : null,
      isAsync: $(el).attr("async") !== undefined,
      isDefer: $(el).attr("defer") !== undefined,
      isModule: $(el).attr("type")?.toLowerCase() === "module",
    });
  });

  const stylesheets: ResourceInfo["stylesheets"] = [];
  $('link[rel="stylesheet" i]').each((_, el) => {
    const href = $(el).attr("href")?.trim() || null;
    stylesheets.push({
      href: href ? resolveUrl(baseUrl, href) || href : null,
    });
  });

  const resources: ResourceInfo = {
    scripts,
    stylesheets,
    totalScriptsCount: scripts.length,
    totalStylesheetsCount: stylesheets.length,
    totalImagesCount: images.length,
  };

  return {
    pageTitle,
    metaDescription,
    canonicalUrl,
    headings,
    links,
    images,
    robots,
    viewport,
    language,
    openGraph,
    twitter,
    structuredData,
    textContent,
    resources,
  };
}
