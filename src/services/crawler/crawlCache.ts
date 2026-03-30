import { prisma } from '../../../lib/prisma.js';
import type { PageData } from './SiteAuditCrawler.js';

// Cache TTL: 7 days (in milliseconds)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if a URL should be re-crawled based on cache age
 */
export async function shouldRecrawl(url: string, forceRecrawl: boolean = false): Promise<boolean> {
  if (forceRecrawl) {
    return true;
  }

  const existing = await prisma.seoPage.findFirst({
    where: { url },
    orderBy: { crawledAt: 'desc' },
    select: { crawledAt: true, headingsData: true },
  });

  if (!existing) {
    return true; // No cached data exists
  }

  // Check if cache has the required data
  if (!existing.headingsData) {
    return true; // Incomplete cache, need to recrawl
  }

  const age = Date.now() - existing.crawledAt.getTime();
  return age > CACHE_TTL;
}

/**
 * Check if multiple URLs need recrawling
 */
export async function checkRecrawlNeeded(
  urls: string[], 
  forceRecrawl: boolean = false
): Promise<{ url: string; needsRecrawl: boolean }[]> {
  if (forceRecrawl) {
    return urls.map(url => ({ url, needsRecrawl: true }));
  }

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      needsRecrawl: await shouldRecrawl(url, forceRecrawl),
    }))
  );

  return results;
}

/**
 * Load cached page data from database
 */
export async function loadCachedPageData(url: string): Promise<PageData | null> {
  const cachedPage = await prisma.seoPage.findFirst({
    where: { url },
    orderBy: { crawledAt: 'desc' },
  });

  if (!cachedPage || !cachedPage.headingsData) {
    return null;
  }

  // Reconstruct PageData from cached JSONB fields
  return {
    url: cachedPage.url,
    title: cachedPage.title,
    description: cachedPage.description,
    statusCode: cachedPage.statusCode,
    loadTime: cachedPage.loadTime,
    
    // Reconstruct content from JSONB
    html: '', // We don't store HTML
    headings: (cachedPage.headingsData as any) || [],
    images: (cachedPage.imagesData as any) || [],
    links: (cachedPage.linksData as any) || [],
    wordCount: cachedPage.wordCount || 0,
    
    // Performance
    lcp: cachedPage.lcp,
    cls: cachedPage.cls,
    fid: cachedPage.fid,
    
    // Meta
    canonical: cachedPage.canonical,
    robots: cachedPage.robots,
    ogImage: cachedPage.ogImage,
    hasSchemaOrg: cachedPage.hasSchemaOrg,
    
    // Local SEO
    localSeo: (cachedPage.localSeoData as any) || undefined,
  };
}

/**
 * Load cached data for multiple pages
 */
export async function loadCachedPagesData(urls: string[]): Promise<PageData[]> {
  const cachedPages = await Promise.all(
    urls.map(url => loadCachedPageData(url))
  );

  // Filter out null results (pages that weren't cached)
  return cachedPages.filter((page): page is PageData => page !== null);
}

/**
 * Save or update cached page data
 * This is called after crawling fresh data
 */
export async function saveCachedPageData(
  pageData: PageData,
  auditReportId: string
): Promise<void> {
  await prisma.seoPage.create({
    data: {
      url: pageData.url,
      title: pageData.title,
      description: pageData.description,
      statusCode: pageData.statusCode,
      loadTime: pageData.loadTime,
      
      lcp: pageData.lcp,
      fid: pageData.fid,
      cls: pageData.cls,
      
      wordCount: pageData.wordCount,
      imageCount: pageData.images.length,
      linkCount: pageData.links.length,
      h1Count: pageData.headings.filter(h => h.level === 1).length,
      
      // Store structured data in JSONB
      headingsData: pageData.headings,
      imagesData: pageData.images,
      linksData: pageData.links,
      
      // Meta data
      canonical: pageData.canonical,
      robots: pageData.robots,
      ogImage: pageData.ogImage,
      hasSchemaOrg: pageData.hasSchemaOrg,
      
      // Local SEO - conditionally include
      ...(pageData.localSeo && { localSeoData: pageData.localSeo }),
      
      crawledAt: new Date(),
      
      auditReportId,
    },
  });
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}> {
  const stats = await prisma.seoPage.aggregate({
    _count: { id: true },
    _min: { crawledAt: true },
    _max: { crawledAt: true },
  });

  return {
    totalCached: stats._count.id,
    oldestCache: stats._min.crawledAt,
    newestCache: stats._max.crawledAt,
  };
}
