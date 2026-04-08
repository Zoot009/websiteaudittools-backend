import type { Page, BrowserContext } from 'playwright';
import { browserPool } from '../crawler/BrowserPool.js';
import { RateLimiter } from '../crawler/humanBehavior.js';
import { getSeedUrls } from '../crawler/sitemapParser.js';

/**
 * Options for URL normalization
 */
export interface NormalizeOptions {
  stripTracking?: boolean;  // Remove utm_*, gclid, fbclid params
  stripFragment?: boolean;  // Remove #hash (default: true)
  lowercaseHost?: boolean;  // Lowercase hostname (default: true)
}

/**
 * Options for link graph crawling
 */
export interface CrawlGraphOptions {
  stripTracking?: boolean;  // Remove tracking parameters
  maxPages?: number;        // Maximum pages to crawl (default: 500)
  maxTimeMs?: number;       // Maximum crawl time in ms (default: 60000)
  timeout?: number;         // Page navigation timeout (default: 30000)
  respectRobots?: boolean;  // Check robots.txt (not implemented in v1)
  seedFromSitemap?: boolean; // Seed from sitemap for orphan detection (default: false)
}

/**
 * Result from crawling a link graph
 */
export interface LinkGraphCrawlResult {
  base_url: string;
  depth: number;
  nodes: Array<{ id: string; orphan?: boolean }>;
  links: Array<{ source: string; target: string }>;
  orphans?: string[];  // List of orphan page URLs (only when seedFromSitemap=true)
  stats: {
    pages_crawled: number;
    edges: number;
    orphan_pages?: number;  // Count of orphan pages (only when seedFromSitemap=true)
    truncated: boolean;
    crawl_time_ms: number;
    reason?: string;  // Reason for truncation if applicable
  };
}

/**
 * Queue item for BFS crawling
 */
interface QueueItem {
  url: string;
  depth: number;
}

/**
 * Edge in the link graph
 */
interface Edge {
  source: string;
  target: string;
}

// Safety limits
const MAX_DEPTH = 5;
const MAX_PAGES_DEFAULT = 500;
const MAX_CRAWL_TIME_MS_DEFAULT = 60000;
const PAGE_TIMEOUT_DEFAULT = 30000;
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid', 'ref', 'source'];

/**
 * Normalize a URL by resolving relative paths, removing fragments,
 * optionally removing tracking parameters, and lowercasing hostname
 */
export function normalizeUrl(
  url: string,
  baseUrl?: string,
  options: NormalizeOptions = {}
): string {
  const {
    stripTracking = false,
    stripFragment = true,
    lowercaseHost = true,
  } = options;

  try {
    // Resolve relative URLs if baseUrl provided
    const absoluteUrl = baseUrl ? new URL(url, baseUrl) : new URL(url);

    // Lowercase hostname
    if (lowercaseHost) {
      absoluteUrl.hostname = absoluteUrl.hostname.toLowerCase();
    }

    // Remove fragment
    if (stripFragment) {
      absoluteUrl.hash = '';
    }

    // Remove tracking parameters
    if (stripTracking) {
      const params = absoluteUrl.searchParams;
      for (const param of TRACKING_PARAMS) {
        params.delete(param);
      }
    }

    return absoluteUrl.href;
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Check if a URL is internal (same host as base)
 * Filters out non-HTTP schemes (mailto:, tel:, javascript:, data:)
 */
export function isInternalUrl(url: string, baseHost: string): boolean {
  try {
    const urlObj = new URL(url);

    // Filter non-HTTP schemes
    if (!urlObj.protocol.startsWith('http')) {
      return false;
    }

    // Exact host matching (case-insensitive)
    return urlObj.hostname.toLowerCase() === baseHost.toLowerCase();
  } catch (error) {
    // Invalid URL
    return false;
  }
}

/**
 * Extract all links from a Playwright page using browser evaluation
 * Returns normalized absolute URLs
 */
export async function extractLinksFromPage(
  page: Page,
  currentUrl: string,
  options: NormalizeOptions = {}
): Promise<string[]> {
  try {
    // Run in browser context to get all <a href> links
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => href && href.trim() !== '');
    });

    // Normalize all links
    return links
      .map(link => normalizeUrl(link, currentUrl, options))
      .filter(link => link.trim() !== '');
  } catch (error) {
    console.error(`Failed to extract links from ${currentUrl}:`, error);
    return [];
  }
}

/**
 * Check if response is HTML based on content-type header
 */
function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) return false;
  
  const lowerType = contentType.toLowerCase();
  return lowerType.includes('text/html') || lowerType.includes('application/xhtml+xml');
}

/**
 * Crawl a website and build an internal link graph using BFS
 * 
 * @param startUrl - Starting URL to crawl
 * @param maxDepth - Maximum depth to crawl (1-5)
 * @param options - Crawl options
 * @returns Link graph data structure compatible with D3.js force-directed graphs
 */
export async function crawlLinkGraph(
  startUrl: string,
  maxDepth: number,
  options: CrawlGraphOptions = {}
): Promise<LinkGraphCrawlResult> {
  // Validate inputs
  if (maxDepth < 1 || maxDepth > MAX_DEPTH) {
    throw new Error(`Depth must be between 1 and ${MAX_DEPTH}`);
  }

  let normalizedStartUrl: string;
  let baseHost: string;

  try {
    const startUrlObj = new URL(startUrl);
    if (!startUrlObj.protocol.startsWith('http')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
    baseHost = startUrlObj.hostname.toLowerCase();
    normalizedStartUrl = normalizeUrl(startUrl, undefined, {
      stripTracking: options.stripTracking ?? false,
      stripFragment: true,
      lowercaseHost: true,
    });
  } catch (error) {
    throw new Error(`Invalid URL: ${startUrl}`);
  }

  // Extract options with defaults
  const maxPages = options.maxPages || MAX_PAGES_DEFAULT;
  const maxTimeMs = options.maxTimeMs || MAX_CRAWL_TIME_MS_DEFAULT;
  const timeout = options.timeout || PAGE_TIMEOUT_DEFAULT;
  const seedFromSitemap = options.seedFromSitemap ?? false;

  // Initialize BFS data structures
  const visited = new Set<string>();
  const queue: QueueItem[] = [];
  const edges = new Map<string, Edge>();  // Use Map with key "source->target" for deduplication
  const inboundCounts = new Map<string, number>();  // Track inbound link counts for orphan detection
  const seededUrls = new Set<string>();  // Track URLs seeded from sitemap
  const rateLimiter = new RateLimiter(2000, 5000);  // 2-5 second delays
  
  const startTime = Date.now();
  let truncated = false;
  let truncationReason: string | undefined;

  console.log(`🕷️  Starting link graph crawl: ${normalizedStartUrl} (max depth: ${maxDepth})`);

  // Seed from sitemap if requested
  if (seedFromSitemap) {
    console.log('🗺️  Seeding from sitemap...');
    try {
      const sitemapUrls = await getSeedUrls(startUrl);
      
      // Normalize all sitemap URLs
      const normalizedSitemapUrls = sitemapUrls
        .map(url => normalizeUrl(url, undefined, {
          stripTracking: options.stripTracking ?? false,
          stripFragment: true,
          lowercaseHost: true,
        }))
        .filter(url => isInternalUrl(url, baseHost));

      // Add all sitemap URLs to queue at depth 0
      for (const url of normalizedSitemapUrls) {
        seededUrls.add(url);
        queue.push({ url, depth: 0 });
        // Initialize inbound count to 0 for all seeded URLs
        inboundCounts.set(url, 0);
      }

      console.log(`🗺️  Seeded ${seededUrls.size} URLs from sitemap`);
    } catch (error) {
      console.error('⚠️  Failed to seed from sitemap:', error);
      // Fall back to starting URL only
      queue.push({ url: normalizedStartUrl, depth: 0 });
      inboundCounts.set(normalizedStartUrl, 0);
    }
  } else {
    // Start with the provided URL
    queue.push({ url: normalizedStartUrl, depth: 0 });
  }

  // BFS crawl loop
  while (queue.length > 0) {
    // Check time limit
    const elapsed = Date.now() - startTime;
    if (elapsed > maxTimeMs) {
      truncated = true;
      truncationReason = `Time limit exceeded (${maxTimeMs}ms)`;
      console.log(`⏱️  ${truncationReason}`);
      break;
    }

    // Check page limit
    if (visited.size >= maxPages) {
      truncated = true;
      truncationReason = `Page limit reached (${maxPages} pages)`;
      console.log(`📊 ${truncationReason}`);
      break;
    }

    // Dequeue next URL
    const { url: currentUrl, depth: currentDepth } = queue.shift()!;

    // Skip if already visited
    if (visited.has(currentUrl)) {
      continue;
    }

    // Mark as visited before crawling to prevent duplicates in queue
    visited.add(currentUrl);

    // Rate limiting (skip for first request)
    if (visited.size > 1) {
      await rateLimiter.waitForNextRequest();
    }

    console.log(`  📄 [Depth ${currentDepth}] Crawling: ${currentUrl} (${visited.size}/${maxPages})`);

    // Acquire browser from pool
    const browser = await browserPool.acquire();
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Create browser context
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeout);

      // Navigate to page
      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: timeout,
      });

      // Check if response is HTML
      const contentType = response?.headers()['content-type'] || null;
      if (!isHtmlResponse(contentType)) {
        console.log(`  ⚠️  Skipping non-HTML response: ${contentType}`);
        continue;
      }

      // Wait briefly for any JS to execute
      await page.waitForTimeout(500);

      // Extract links from page
      const extractedLinks = await extractLinksFromPage(page, currentUrl, {
        stripTracking: options.stripTracking ?? false,
        stripFragment: true,
        lowercaseHost: true,
      });

      // Filter to internal links only
      const internalLinks = extractedLinks.filter(link => isInternalUrl(link, baseHost));

      console.log(`  🔗 Found ${internalLinks.length} internal links`);

      // Add edges for all internal links
      for (const targetUrl of internalLinks) {
        const edgeKey = `${currentUrl}→${targetUrl}`;
        if (!edges.has(edgeKey)) {
          edges.set(edgeKey, { source: currentUrl, target: targetUrl });
          
          // Track inbound count for orphan detection
          if (seedFromSitemap) {
            inboundCounts.set(targetUrl, (inboundCounts.get(targetUrl) || 0) + 1);
          }
        }

        // Enqueue link if within depth limit and not already visited
        if (currentDepth < maxDepth && !visited.has(targetUrl)) {
          // Check if already in queue to avoid duplicates
          const alreadyQueued = queue.some(item => item.url === targetUrl);
          if (!alreadyQueued) {
            queue.push({ url: targetUrl, depth: currentDepth + 1 });
            
            // Initialize inbound count for newly discovered URLs
            if (seedFromSitemap && !inboundCounts.has(targetUrl)) {
              inboundCounts.set(targetUrl, 0);
            }
          }
        }
      }

    } catch (error: any) {
      // Log error but continue crawling
      console.error(`  ❌ Error crawling ${currentUrl}:`, error.message);
      // Continue to next URL
    } finally {
      // Cleanup
      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      browserPool.release(browser);
    }
  }

  const crawlTime = Date.now() - startTime;
  console.log(`✅ Crawl completed: ${visited.size} pages, ${edges.size} edges in ${crawlTime}ms`);

  // Calculate orphan pages if sitemap seeding was used
  let orphanPages: string[] = [];
  if (seedFromSitemap) {
    // Orphans are seeded URLs with 0 inbound links (excluding the start URL itself)
    orphanPages = Array.from(seededUrls).filter(url => {
      const inbound = inboundCounts.get(url) || 0;
      // The start URL is not considered an orphan even with 0 inbound links
      return inbound === 0 && url !== normalizedStartUrl;
    });
    
    if (orphanPages.length > 0) {
      console.log(`🔍 Found ${orphanPages.length} orphan pages (no inbound links)`);
    }
  }

  // Build D3-compatible graph structure
  const nodes = Array.from(visited).map(url => {
    const node: { id: string; orphan?: boolean } = { id: url };
    // Mark orphan nodes
    if (seedFromSitemap && orphanPages.includes(url)) {
      node.orphan = true;
    }
    return node;
  });
  const links = Array.from(edges.values());

  // Validate that all edge references exist in nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(link => {
    const valid = nodeIds.has(link.source) && nodeIds.has(link.target);
    if (!valid) {
      console.warn(`⚠️  Invalid edge (node not found): ${link.source} -> ${link.target}`);
    }
    return valid;
  });

  return {
    base_url: normalizedStartUrl,
    depth: maxDepth,
    nodes,
    links: validLinks,
    ...(seedFromSitemap && orphanPages.length > 0 && { orphans: orphanPages }),
    stats: {
      pages_crawled: visited.size,
      edges: validLinks.length,
      ...(seedFromSitemap && { orphan_pages: orphanPages.length }),
      truncated,
      crawl_time_ms: crawlTime,
      ...(truncationReason && { reason: truncationReason }),
    },
  };
}
