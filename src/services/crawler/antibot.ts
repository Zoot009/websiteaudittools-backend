/**
 * Cloudflare and Bot Protection Detection
 * Detects various anti-bot challenges and protection mechanisms
 */

export interface CloudflareDetection {
  isBlocked: boolean;
  method: 'cloudflare' | 'ddos-guard' | 'generic' | null;
  evidence: string[];
}

/**
 * Detect if a response is blocked by Cloudflare or other anti-bot services
 * @param statusCode HTTP status code
 * @param headers Response headers
 * @param body Response body (HTML)
 */
export function detectCloudflareBlock(
  statusCode: number,
  headers: Record<string, string | string[] | undefined>,
  body: string
): CloudflareDetection {
  const evidence: string[] = [];
  let method: CloudflareDetection['method'] = null;

  // Normalize headers for case-insensitive checking
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const headerValue = Array.isArray(value) ? value[0] : value;
    if (headerValue) {
      normalizedHeaders[key.toLowerCase()] = headerValue.toLowerCase();
    }
  }

  // Check body content for challenge pages (works even with 200 status)
  if (typeof body === 'string' && body.length > 0) {
    const lowerBody = body.toLowerCase();

    // Cloudflare challenge indicators
    const cfIndicators = [
      'just a moment',
      'checking your browser',
      'cf-browser-verification',
      'performing security verification',
      'enable javascript and cookies', // Cloudflare's wording
      'cloudflare ray id',
    ];

    for (const indicator of cfIndicators) {
      if (lowerBody.includes(indicator)) {
        evidence.push(`Body contains: "${indicator}"`);
        method = 'cloudflare';
      }
    }

    // Special case: "enable javascript" + "cloudflare" together
    if (lowerBody.includes('enable javascript') && lowerBody.includes('cloudflare')) {
      evidence.push('Cloudflare JavaScript challenge detected');
      method = 'cloudflare';
    }

    // DDoS-Guard detection
    if (lowerBody.includes('ddos-guard') || lowerBody.includes('ddosguard')) {
      evidence.push('DDoS-Guard protection detected');
      method = 'ddos-guard';
    }
  }

  // Check headers for Cloudflare
  if (normalizedHeaders['cf-ray']) {
    evidence.push(`Cloudflare Ray ID present: ${normalizedHeaders['cf-ray']}`);
    method = 'cloudflare';
  }

  if (normalizedHeaders['server']?.includes('cloudflare')) {
    evidence.push('Server header indicates Cloudflare');
    method = 'cloudflare';
  }

  // Check status codes (only if we already suspect blocking)
  const blockingStatusCodes = [403, 503, 429];
  if (blockingStatusCodes.includes(statusCode)) {
    evidence.push(`Blocking status code: ${statusCode}`);

    // If Cloudflare headers are present with blocking status, it's likely a block
    if (normalizedHeaders['cf-ray'] || normalizedHeaders['server']?.includes('cloudflare')) {
      if (!method) method = 'cloudflare';
    } else if (evidence.length === 1) {
      // Only have status code, could be generic block
      method = 'generic';
    }
  }

  return {
    isBlocked: evidence.length > 0,
    method,
    evidence,
  };
}

/**
 * User agent rotation for reducing bot fingerprinting
 */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];

/**
 * Get a random user agent for requests
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index] ?? USER_AGENTS[0] ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
}

/**
 * Check if a URL should be filtered out (assets, etc.)
 */
export function isPageUrl(url: string): boolean {
  const assetExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.svg',
    '.webp',
    '.ico',
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.mkv',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.zip',
    '.rar',
    '.tar',
    '.gz',
    '.ttf',
    '.woff',
    '.woff2',
    '.eot',
    '.js',
    '.css',
    '.xml',
    '.json',
    '.txt',
  ];

  const assetDirs = [
    '/wp-content/uploads/',
    '/assets/',
    '/static/',
    '/images/',
    '/img/',
    '/media/',
    '/files/',
    '/css/',
    '/js/',
  ];

  const lower = url.toLowerCase().split('?')[0];
  if (!lower) return true;

  for (const ext of assetExtensions) {
    if (lower.endsWith(ext)) return false;
  }

  for (const dir of assetDirs) {
    if (lower.includes(dir)) return false;
  }

  return true;
}

/**
 * Clean URL for deduplication (remove fragments)
 */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return url;
  }
}

/**
 * Check if URL is a sitemap entry
 */
export function isSitemapUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('sitemap') || lower.endsWith('.xml') || lower.endsWith('.xml.gz');
}

/**
 * Get domain from URL
 */
export function getDomain(url: string): string {
  const u = new URL(url);
  return u.protocol + '//' + u.host;
}

/**
 * Normalize URL (ensure protocol)
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}
