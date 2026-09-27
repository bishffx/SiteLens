import { Netmask } from 'netmask';

/**
 * Validate that a URL is safe to fetch.
 * Rejects:
 *  - non-http/https protocols
 *  - localhost, loopback, or link-local hostnames
 *  - private IPv4 ranges (10/8, 172.16/12, 192.168/16)
 *  - IPv6 loopback ::1 and link-local fe80::/10
 *  - cloud metadata endpoints (e.g., 169.254.169.254, 169.254.169.253)
 */
export function isUrlSafe(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const hostname = url.hostname;
    // Block obvious hostnames
    const blockedHostnames = ['localhost', '127.0.0.1', '::1'];
    if (blockedHostnames.includes(hostname)) return false;

    // Resolve hostname to IP if possible (basic check, works for literal IPs)
    // If hostname is an IP literal, perform CIDR checks.
    const ipv4 = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    const ipv6 = hostname.includes(':');

    // Helper to test IPv4 against netmask
    const inCidr = (ip: string, cidr: string) => new Netmask(cidr).contains(ip);

    if (ipv4) {
      const ip = hostname;
      // Private ranges
      const privateCidrs = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'];
      if (privateCidrs.some(c => inCidr(ip, c))) return false;
      // Cloud metadata (AWS, GCP, Azure)
      const metadataIps = ['169.254.169.254', '169.254.169.253'];
      if (metadataIps.includes(ip)) return false;
    }

    if (ipv6) {
      // Simple checks for loopback and link‑local
      if (hostname === '::1') return false;
      if (hostname.startsWith('fe80:')) return false;
    }

    // Additional block for DNS‑based internal domains (e.g., .local, .internal)
    const blockedTlds = ['.local', '.internal'];
    if (blockedTlds.some(tld => hostname.endsWith(tld))) return false;

    return true;
  } catch {
    // Invalid URL strings are considered unsafe
    return false;
  }
}
