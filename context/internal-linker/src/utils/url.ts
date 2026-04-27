/**
 * URL utility functions for normalizing and validating URLs
 */

/**
 * Normalize a URL by removing trailing slashes, fragments, and query parameters (optional)
 */
export function normalizeUrl(url: string, removeQuery: boolean = false): string {
  try {
    const urlObj = new URL(url);
    
    // Remove fragment
    urlObj.hash = '';
    
    // Optionally remove query parameters
    if (removeQuery) {
      urlObj.search = '';
    }
    
    // Remove trailing slash from pathname (except for root)
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL is invalid, return as-is
    return url;
  }
}

/**
 * Check if a URL belongs to the same domain as the base URL
 */
export function isSameDomain(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    
    // Compare hostname (including subdomains)
    return urlObj.hostname === baseUrlObj.hostname;
  } catch (error) {
    return false;
  }
}

/**
 * Convert a relative URL to an absolute URL based on the base URL
 */
export function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (error) {
    return relativeUrl;
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract the base URL (protocol + hostname) from a URL
 */
export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (error) {
    return url;
  }
}

/**
 * Check if a URL should be crawled (filters out non-HTTP protocols, files, etc.)
 */
export function shouldCrawlUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Skip common file extensions
    const pathname = urlObj.pathname.toLowerCase();
    const skipExtensions = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav',
      '.zip', '.rar', '.tar', '.gz',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.css', '.js', '.json', '.xml', '.txt'
    ];
    
    return !skipExtensions.some(ext => pathname.endsWith(ext));
  } catch (error) {
    return false;
  }
}
