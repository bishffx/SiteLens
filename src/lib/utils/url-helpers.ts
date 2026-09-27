/**
 * Utility functions for URL manipulation and normalization.
 */

export function normalizeUrl(inputUrl: string): string {
  const withProtocol = inputUrl.startsWith("http://") || inputUrl.startsWith("https://")
    ? inputUrl
    : `https://${inputUrl}`;
  const url = new URL(withProtocol);
  url.hostname = url.hostname.toLowerCase();
  // Remove default ports if explicit
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  // Strip trailing slash if it's the root path
  if (url.pathname === "/") {
    url.pathname = "";
  }
  return url.toString();
}

export function extractDomain(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
    return url.hostname;
  } catch {
    return inputUrl;
  }
}

export function resolveUrl(base: string, relativePath: string): string | null {
  try {
    return new URL(relativePath, base).toString();
  } catch {
    return null;
  }
}

export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch {
    return false;
  }
}
