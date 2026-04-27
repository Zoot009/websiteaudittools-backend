/**
 * Sitemap fetcher and parser to extract URLs from sitemap.xml
 */

import Sitemapper from 'sitemapper';
import { normalizeUrl } from '../utils/url.js';

/**
 * Fetch and parse sitemap to extract all URLs
 */
export async function fetchSitemapUrls(
  baseUrl: string,
  scrapeDoToken: string
): Promise<string[]> {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap-index.xml`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const urls = await parseSitemap(sitemapUrl);
      if (urls.length > 0) {
        return urls.map(url => normalizeUrl(url, false));
      }
    } catch (error) {
      // Try next sitemap URL
      continue;
    }
  }

  return [];
}

/**
 * Parse a sitemap URL and return all URLs
 */
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const sitemap = new Sitemapper({
      url: sitemapUrl,
      timeout: 30000, // 30 seconds
      retries: 2,
      rejectUnauthorized: false, // Allow self-signed certificates
    });

    const { sites } = await sitemap.fetch();
    return sites;
  } catch (error) {
    throw new Error(
      `Failed to fetch sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
