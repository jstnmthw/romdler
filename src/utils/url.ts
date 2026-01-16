/**
 * Resolves a potentially relative href against a base URL.
 * Uses the WHATWG URL API for standards-compliant resolution.
 */
export function resolveUrl(href: string, baseUrl: string): string {
  try {
    const resolved = new URL(href, baseUrl);
    return resolved.href;
  } catch {
    throw new Error(`Invalid URL: "${href}" with base "${baseUrl}"`);
  }
}

/**
 * Extracts the filename from a URL path.
 * Handles URL encoding and removes query strings.
 */
export function extractFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];

    if (lastSegment === undefined || lastSegment === '') {
      return 'index';
    }

    // Decode URL encoding
    return decodeURIComponent(lastSegment);
  } catch {
    // Fallback for malformed URLs
    const parts = url.split('/');
    return parts[parts.length - 1] ?? 'unknown';
  }
}

/**
 * Validates that a URL uses HTTP or HTTPS protocol.
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
