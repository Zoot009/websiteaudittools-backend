/**
 * Sitemap Parser and URL Discovery
 * Discovers and parses sitemaps to seed the crawler
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { getRandomUserAgent, isSitemapUrl, isPageUrl, getDomain } from './antibot';

/**
 * Get sitemap URLs from robots.txt
 */
export async function getSitemapsFromRobots(domain: string): Promise<string[]> {
  const sitemaps: string[] = [];

  try {
    console.log('[SITEMAP] Checking robots.txt...');
    const res = await axios.get(`${domain}/robots.txt`, {
      timeout: 10000,
      headers: { 'User-Agent': getRandomUserAgent() },
    });

    for (const line of res.data.split('\n')) {
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
    const res = await axios.get(sitemapUrl, {
      timeout: 15000,
      headers: { 'User-Agent': getRandomUserAgent() },
      responseType: 'text',
    });

    const xml = await parseStringPromise(res.data, { explicitArray: true });

    // Sitemap index - recurse into each child sitemap
    if (xml.sitemapindex) {
      const children = xml.sitemapindex.sitemap || [];
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
  } catch (error) {
    console.log(`[SITEMAP]  ✗ Failed to fetch/parse: ${sitemapUrl}`);
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
  const robotsSitemaps = await getSitemapsFromRobots(domain);

  // Add default sitemap.xml if not found in robots.txt
  if (!robotsSitemaps.some((s) => s.includes('sitemap.xml'))) {
    robotsSitemaps.push(`${domain}/sitemap.xml`);
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

  const robotsSitemaps = await getSitemapsFromRobots(domain);

  // Try common sitemap locations when robots.txt has no sitemap entries.
  if (robotsSitemaps.length === 0) {
    robotsSitemaps.push(`${domain}/sitemap.xml`);
    robotsSitemaps.push(`${domain}/sitemap_index.xml`);
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
