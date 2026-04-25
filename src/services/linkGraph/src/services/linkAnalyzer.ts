/**
 * Link graph analyzer for calculating inbound links and identifying orphan pages
 */

import type { LinkMap, InboundLinksCount, InternalLinkAnalysis, CrawlMetadata } from '../types.js';

/**
 * Analyze the link graph to calculate inbound links and identify orphan pages
 */
export function analyzeLinkGraph(
  linkMap: LinkMap,
  sitemapUrls: string[],
  metadata: CrawlMetadata
): InternalLinkAnalysis {
  // Calculate inbound links count
  const inboundLinksCount = calculateInboundLinks(linkMap);

  // Identify orphan pages
  const orphanPages = identifyOrphanPages(linkMap, sitemapUrls, inboundLinksCount);

  return {
    linkGraph: linkMap,
    inboundLinksCount,
    orphanPages,
    metadata,
  };
}

/**
 * Calculate the number of inbound links for each page
 */
function calculateInboundLinks(linkMap: LinkMap): InboundLinksCount {
  const inboundLinksCount: InboundLinksCount = {};

  // Initialize all pages with 0 inbound links
  for (const page of Object.keys(linkMap)) {
    inboundLinksCount[page] = 0;
  }

  // Count inbound links from all pages
  for (const [sourcePage, targetPages] of Object.entries(linkMap)) {
    for (const targetPage of targetPages) {
      if (!inboundLinksCount[targetPage]) {
        inboundLinksCount[targetPage] = 0;
      }
      inboundLinksCount[targetPage]++;
    }
  }

  return inboundLinksCount;
}

/**
 * Identify orphan pages (pages in sitemap but not linked from any crawled page)
 */
function identifyOrphanPages(
  linkMap: LinkMap,
  sitemapUrls: string[],
  inboundLinksCount: InboundLinksCount
): string[] {
  // If no sitemap, we can't identify orphans
  if (sitemapUrls.length === 0) {
    return [];
  }

  const orphans: string[] = [];
  const crawledPages = new Set(Object.keys(linkMap));

  for (const sitemapUrl of sitemapUrls) {
    // Check if the page is in the crawled set
    if (!crawledPages.has(sitemapUrl)) {
      // Page is in sitemap but wasn't crawled - might be orphan
      orphans.push(sitemapUrl);
    } else {
      // Page was crawled - check if it has any inbound links
      const inboundCount = inboundLinksCount[sitemapUrl] || 0;
      
      // If it has 0 inbound links, it's an orphan
      if (inboundCount === 0) {
        orphans.push(sitemapUrl);
      }
    }
  }

  return orphans;
}

/**
 * Get pages sorted by inbound link count (descending)
 */
export function getTopLinkedPages(
  inboundLinksCount: InboundLinksCount,
  limit: number = 10
): Array<{ url: string; inboundLinks: number }> {
  return Object.entries(inboundLinksCount)
    .map(([url, count]) => ({ url, inboundLinks: count }))
    .sort((a, b) => b.inboundLinks - a.inboundLinks)
    .slice(0, limit);
}

/**
 * Get pages with no inbound links (potential orphans from crawled pages)
 */
export function getPagesWithNoInboundLinks(inboundLinksCount: InboundLinksCount): string[] {
  return Object.entries(inboundLinksCount)
    .filter(([_, count]) => count === 0)
    .map(([url]) => url);
}

/**
 * Get summary statistics about the link graph
 */
export function getLinkGraphStats(linkMap: LinkMap, inboundLinksCount: InboundLinksCount) {
  const totalPages = Object.keys(linkMap).length;
  const totalLinks = Object.values(linkMap).reduce((sum, links) => sum + links.length, 0);
  const avgOutboundLinks = totalPages > 0 ? totalLinks / totalPages : 0;
  
  const inboundCounts = Object.values(inboundLinksCount);
  const avgInboundLinks = inboundCounts.length > 0
    ? inboundCounts.reduce((sum, count) => sum + count, 0) / inboundCounts.length
    : 0;

  const maxInboundLinks = Math.max(...inboundCounts, 0);
  const pagesWithNoInbound = inboundCounts.filter(count => count === 0).length;

  return {
    totalPages,
    totalLinks,
    avgOutboundLinks: Math.round(avgOutboundLinks * 100) / 100,
    avgInboundLinks: Math.round(avgInboundLinks * 100) / 100,
    maxInboundLinks,
    pagesWithNoInbound,
  };
}
