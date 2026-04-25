/**
 * Type definitions for internal linking analysis
 */

/**
 * Map of URLs to their outgoing internal links
 */
export interface LinkMap {
  [url: string]: string[];
}

/**
 * Map of URLs to the count of inbound links
 */
export interface InboundLinksCount {
  [url: string]: number;
}

/**
 * Metadata about the crawling process
 */
export interface CrawlMetadata {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  totalPagesCrawled: number;
  totalPagesInSitemap: number;
  maxDepthReached: number;
  errorsEncountered: number;
  errorDetails: CrawlError[];
}

/**
 * Error encountered during crawling
 */
export interface CrawlError {
  url: string;
  error: string;
  timestamp: Date;
}

/**
 * Result of a single page crawl
 */
export interface PageCrawlResult {
  url: string;
  links: string[];
  depth: number;
  success: boolean;
  error?: string;
}

/**
 * Complete internal link analysis result
 */
export interface InternalLinkAnalysis {
  linkGraph: LinkMap;
  inboundLinksCount: InboundLinksCount;
  orphanPages: string[];
  metadata: CrawlMetadata;
}

/**
 * API response with analysis results (includes stats and url)
 */
export interface InternalLinkAnalysisResponse extends InternalLinkAnalysis {
  url: string;
  stats?: {
    totalPages: number;
    totalLinks: number;
    avgOutboundLinks: number;
    avgInboundLinks: number;
    maxInboundLinks: number;
    pagesWithNoInbound: number;
  };
}


/**
 * Configuration for crawler
 */
export interface CrawlerConfig {
  maxPages: number;
  maxDepth: number;
  delayMs: number;
  scrapeDoToken: string;
  baseUrl: string;
  jobId?: string; // Optional BullMQ job ID for credit tracking
}

/**
 * Item in the crawl queue
 */
export interface QueueItem {
  url: string;
  depth: number;
}
