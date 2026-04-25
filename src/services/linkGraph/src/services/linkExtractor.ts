/**
 * Link extractor using Cheerio to parse HTML and extract internal links
 */

import * as cheerio from 'cheerio';
import { toAbsoluteUrl, normalizeUrl, isSameDomain, shouldCrawlUrl } from '../utils/url.js';

/**
 * Extract all internal links from HTML content
 */
export function extractInternalLinks(
  html: string,
  baseUrl: string,
  currentPageUrl: string
): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  // Find all anchor tags with href attributes
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    
    if (!href) {
      return;
    }

    // Convert to absolute URL
    const absoluteUrl = toAbsoluteUrl(href, currentPageUrl);

    // Check if it's a valid URL
    if (!shouldCrawlUrl(absoluteUrl)) {
      return;
    }

    // Check if it's an internal link (same domain)
    if (!isSameDomain(absoluteUrl, baseUrl)) {
      return;
    }

    // Normalize the URL (remove fragments, trailing slashes)
    const normalizedUrl = normalizeUrl(absoluteUrl, false);

    links.add(normalizedUrl);
  });

  return Array.from(links);
}

/**
 * Extract title from HTML
 */
export function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').text().trim() || '';
}

/**
 * Extract meta description from HTML
 */
export function extractMetaDescription(html: string): string {
  const $ = cheerio.load(html);
  return $('meta[name="description"]').attr('content') || '';
}
