/**
 * Queue-based web crawler with depth tracking and rate limiting
 */

import { fetchWithScrapeDo } from './scrapeDoClient.js';
import { extractInternalLinks } from './linkExtractor.js';
import { fetchSitemapUrls } from './sitemapParser.js';
import { normalizeUrl, getBaseUrl } from '../utils/url.js';
import type {
  CrawlerConfig,
  QueueItem,
  PageCrawlResult,
  LinkMap,
  CrawlMetadata,
  CrawlError,
} from '../types.js';

export class Crawler {
  private config: CrawlerConfig;
  private queue: QueueItem[] = [];
  private visited: Set<string> = new Set();
  private linkMap: LinkMap = {};
  private errors: CrawlError[] = [];
  private maxDepthReached: number = 0;
  private startTime: Date = new Date();

  constructor(config: CrawlerConfig) {
    this.config = config;
  }

  /**
   * Start crawling from the base URL
   */
  async crawl(): Promise<{ linkMap: LinkMap; metadata: CrawlMetadata; sitemapUrls: string[] }> {
    this.startTime = new Date();
    const baseUrl = getBaseUrl(this.config.baseUrl);
    const normalizedStartUrl = normalizeUrl(this.config.baseUrl, false);

    // Add the starting URL to the queue
    this.queue.push({ url: normalizedStartUrl, depth: 0 });

    // Phase 1: Depth-based crawling
    console.log('Phase 1: Starting depth-based crawl...');
    await this.crawlQueue();

    // Fetch sitemap URLs
    console.log('Fetching sitemap...');
    const sitemapUrls = await this.fetchSitemap(baseUrl);
    console.log(`Found ${sitemapUrls.length} URLs in sitemap`);

    // Phase 2: Crawl remaining sitemap URLs
    if (sitemapUrls.length > 0) {
      console.log('Phase 2: Crawling remaining sitemap URLs...');
      await this.crawlSitemapUrls(sitemapUrls);
    }

    const endTime = new Date();
    const metadata: CrawlMetadata = {
      startTime: this.startTime,
      endTime,
      durationMs: endTime.getTime() - this.startTime.getTime(),
      totalPagesCrawled: this.visited.size,
      totalPagesInSitemap: sitemapUrls.length,
      maxDepthReached: this.maxDepthReached,
      errorsEncountered: this.errors.length,
      errorDetails: this.errors,
    };

    return {
      linkMap: this.linkMap,
      metadata,
      sitemapUrls,
    };
  }

  /**
   * Process the crawl queue with depth and page limits
   */
  private async crawlQueue(): Promise<void> {
    while (this.queue.length > 0 && this.visited.size < this.config.maxPages) {
      const item = this.queue.shift();
      if (!item) break;

      // Skip if already visited
      if (this.visited.has(item.url)) {
        continue;
      }

      // Skip if exceeds max depth
      if (item.depth > this.config.maxDepth) {
        continue;
      }

      // Update max depth reached
      this.maxDepthReached = Math.max(this.maxDepthReached, item.depth);

      // Crawl the page
      const result = await this.crawlPage(item.url, item.depth);

      // Mark as visited
      this.visited.add(item.url);

      if (result.success && result.links.length > 0) {
        // Store in link map
        this.linkMap[item.url] = result.links;

        // Add new links to queue
        for (const link of result.links) {
          if (!this.visited.has(link) && !this.isInQueue(link)) {
            this.queue.push({ url: link, depth: item.depth + 1 });
          }
        }
      } else if (!result.success && result.error) {
        this.errors.push({
          url: item.url,
          error: result.error,
          timestamp: new Date(),
        });
      }

      // Rate limiting delay
      if (this.queue.length > 0) {
        await this.delay(this.config.delayMs);
      }
    }
  }

  /**
   * Crawl URLs from sitemap that haven't been visited yet
   */
  private async crawlSitemapUrls(sitemapUrls: string[]): Promise<void> {
    const unvisitedUrls = sitemapUrls.filter(url => !this.visited.has(url));
    let crawledCount = 0;

    for (const url of unvisitedUrls) {
      // Stop if we've reached the page limit
      if (this.visited.size >= this.config.maxPages) {
        break;
      }

      // Skip if already visited (might have been added during phase 1)
      if (this.visited.has(url)) {
        continue;
      }

      // Crawl the page without adding its links to the queue
      const result = await this.crawlPage(url, this.config.maxDepth + 1);

      // Mark as visited
      this.visited.add(url);
      crawledCount++;

      if (result.success && result.links.length > 0) {
        this.linkMap[url] = result.links;
      } else if (!result.success && result.error) {
        this.errors.push({
          url,
          error: result.error,
          timestamp: new Date(),
        });
      }

      // Rate limiting delay
      if (crawledCount < unvisitedUrls.length) {
        await this.delay(this.config.delayMs);
      }
    }

    console.log(`Phase 2 complete: Crawled ${crawledCount} additional URLs from sitemap`);
  }

  /**
   * Crawl a single page and extract links
   */
  private async crawlPage(url: string, depth: number): Promise<PageCrawlResult> {
    try {
      console.log(`Crawling [depth=${depth}]: ${url}`);

      const response = await fetchWithScrapeDo(url, this.config.scrapeDoToken, {
        render: false,
        timeout: 30000,
      }, this.config.jobId);

      if (!response.success) {
        return {
          url,
          links: [],
          depth,
          success: false,
          error: response.error || `HTTP ${response.statusCode}`,
        };
      }

      // Extract internal links
      const links = extractInternalLinks(
        response.html,
        getBaseUrl(this.config.baseUrl),
        url
      );

      return {
        url,
        links,
        depth,
        success: true,
      };
    } catch (error) {
      return {
        url,
        links: [],
        depth,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch sitemap URLs
   */
  private async fetchSitemap(baseUrl: string): Promise<string[]> {
    try {
      return await fetchSitemapUrls(baseUrl, this.config.scrapeDoToken);
    } catch (error) {
      console.error('Failed to fetch sitemap:', error);
      return [];
    }
  }

  /**
   * Check if a URL is already in the queue
   */
  private isInQueue(url: string): boolean {
    return this.queue.some(item => item.url === url);
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
