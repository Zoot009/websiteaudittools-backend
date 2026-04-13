/**
 * Sitemap Parser and URL Discovery
 * Discovers and parses sitemaps to seed the crawler
 */

import { parseStringPromise } from 'xml2js';
import { isSitemapUrl, isPageUrl, getDomain } from './antibot';
import { browserPool } from './BrowserPool';

/**
 * Fetch content using Playwright to bypass anti-bot protection
 */
async function fetchWithBrowser(url: string): Promise<string | null> {
  let browser = null;
  
  try {
    await browserPool.initialize();
    browser = await browserPool.acquire();
    const context = await browserPool.createStealthContext(browser);
    
    // Use API request instead of page.goto for better performance with text files
    try {
      const response = await context.request.get(url, {
        timeout: 15000,
      });
      
      const status = response.status();
      
      // Debug: Log status for failed requests
      if (status >= 400) {
        console.log(`[SITEMAP]    ↳ HTTP ${status}`);
        await context.close();
        return null;
      }
      
      // Get response body as text
      const content = await response.text();
      
      // Debug: Log content type and length
      const contentType = response.headers()['content-type'] || 'unknown';
      console.log(`[SITEMAP]    ↳ HTTP ${status}, ${contentType}, ${content.length} bytes`);
      
      await context.close();
      return content;
      
    } catch (apiError: any) {
      // Fallback to page.goto if API request fails
      console.log(`[SITEMAP]    ↳ API request failed, trying page.goto...`);
      
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      
      if (!response) {
        console.log(`[SITEMAP]    ↳ No response received`);
        await context.close();
        return null;
      }
      
      const status = response.status();
      
      if (status >= 400) {
        console.log(`[SITEMAP]    ↳ HTTP ${status}`);
        await context.close();
        return null;
      }
      
      const content = await response.text();
      const contentType = response.headers()['content-type'] || 'unknown';
      console.log(`[SITEMAP]    ↳ HTTP ${status}, ${contentType}, ${content.length} bytes`);
      
      await context.close();
      return content;
    }
  } catch (error: any) {
    // Log the error for debugging
    console.log(`[SITEMAP]    ↳ Error: ${error.message}`);
    return null;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
}

/**
 * Get sitemap URLs from robots.txt
 */
export async function getSitemapsFromRobots(domain: string): Promise<string[]> {
  const sitemaps: string[] = [];

  try {
    console.log('[SITEMAP] Checking robots.txt...');
    const content = await fetchWithBrowser(`${domain}/robots.txt`);
    
    if (!content) {
      console.log('[SITEMAP] robots.txt not accessible or not found');
      return sitemaps;
    }

    for (const line of content.split('\n')) {
      // Handle whitespace/comments/case variants like "  Sitemap: https://..."
      const normalizedLine = line.trim();
      if (!normalizedLine || normalizedLine.startsWith('#')) {
        continue;
      }

      if (normalizedLine.toLowerCase().startsWith('sitemap:')) {
        const sm = normalizedLine.split(':').slice(1).join(':').trim();
        if (sm) sitemaps.push(sm);
      }
    }

    console.log(`[SITEMAP] Found ${sitemaps.length} sitemap(s) in robots.txt`);
  } catch (error) {
    console.log('[SITEMAP] robots.txt not accessible or not found');
  }

  return sitemaps;
}

/**
 * Recursively resolve a sitemap or sitemap index
 * Returns all page URLs found
 */
export async function resolveSitemap(sitemapUrl: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(sitemapUrl)) return [];
  visited.add(sitemapUrl);

  const urls: string[] = [];

  try {
    console.log(`[SITEMAP]  → Fetching sitemap: ${sitemapUrl}`);
    const content = await fetchWithBrowser(sitemapUrl);
    
    if (!content) {
      console.log(`[SITEMAP]  ✗ Failed to fetch: ${sitemapUrl}`);
      return urls;
    }

    // Try to parse as XML
    const xml = await parseStringPromise(content, { explicitArray: true });

    // Sitemap index - recurse into each child sitemap
    if (xml.sitemapindex) {
      const children = xml.sitemapindex.sitemap || [];
      console.log(`[SITEMAP]  📑 Found sitemap index with ${children.length} child sitemap(s)`);
      for (const child of children) {
        const loc = child.loc?.[0];
        if (loc) {
          const nested = await resolveSitemap(loc, visited);
          urls.push(...nested);
        }
      }
    }

    // Regular URL set
    if (xml.urlset) {
      const entries = xml.urlset.url || [];
      for (const entry of entries) {
        const loc = entry.loc?.[0];
        if (loc && !isSitemapUrl(loc)) {
          urls.push(loc);
        }
      }
    }

    console.log(`[SITEMAP]  ✓ ${urls.length} URLs from ${sitemapUrl}`);
  } catch (error: any) {
    console.log(`[SITEMAP]  ✗ Failed to parse: ${sitemapUrl} (${error.message})`);
  }

  return urls;
}

/**
 * Collect seed URLs from all sitemaps
 * These prime the BFS queue
 */
export async function getSeedUrls(baseUrl: string): Promise<string[]> {
  const domain = getDomain(baseUrl);
  const seed = new Set<string>();

  // Get sitemaps from robots.txt
  let robotsSitemaps = await getSitemapsFromRobots(domain);

  // Try common sitemap locations if none found in robots.txt
  if (robotsSitemaps.length === 0) {
    console.log('[SITEMAP] No sitemaps in robots.txt, trying common locations...');
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap-index.xml',
      '/sitemap1.xml',
      '/post-sitemap.xml',
      '/page-sitemap.xml'
    ];
    
    robotsSitemaps = sitemapPaths.map(path => `${domain}${path}`);
  }

  // Resolve all sitemaps
  const visited = new Set<string>();
  for (const sm of robotsSitemaps) {
    const urls = await resolveSitemap(sm, visited);
    urls
      .filter((u) => isPageUrl(u) && u.startsWith(domain))
      .forEach((u) => seed.add(u));
  }

  // Always seed with homepage
  seed.add(domain + '/');
  seed.add(baseUrl);

  console.log(`[SITEMAP] Seeded ${seed.size} URLs from sitemaps`);
  return [...seed];
}

/**
 * Discover sitemap page URLs for analyzer context.
 * Unlike getSeedUrls, this does NOT force-add homepage/base URL.
 */
export async function discoverSitemapPageUrls(baseUrl: string): Promise<Set<string>> {
  const domain = getDomain(baseUrl);
  const pageUrls = new Set<string>();

  let robotsSitemaps = await getSitemapsFromRobots(domain);

  // Try common sitemap locations when robots.txt has no sitemap entries.
  if (robotsSitemaps.length === 0) {
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap-index.xml',
      '/sitemap1.xml',
      '/post-sitemap.xml',
      '/page-sitemap.xml'
    ];
    
    robotsSitemaps = sitemapPaths.map(path => `${domain}${path}`);
  }

  const visited = new Set<string>();
  for (const sm of robotsSitemaps) {
    const urls = await resolveSitemap(sm, visited);
    urls
      .filter((u) => isPageUrl(u) && u.startsWith(domain))
      .forEach((u) => pageUrls.add(u));
  }

  return pageUrls;
}
