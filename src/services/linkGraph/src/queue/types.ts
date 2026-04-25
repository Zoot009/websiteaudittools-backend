/**
 * Job types for BullMQ
 */

import type { InternalLinkAnalysisResponse } from '../types.js';

/**
 * Job data for crawl requests
 */
export interface CrawlJobData {
  url: string;
  scrapeDoToken?: string;
  maxPages?: number;
  maxDepth?: number;
  rateLimit?: number;
}

/**
 * Job result for crawl requests
 * Contains only summary data to avoid Redis size limits
 * Full data is stored in the database
 */
export interface CrawlJobResult {
  success: boolean;
  summary?: {
    url: string;
    pagesCrawled: number;
    pagesInSitemap: number;
    internalLinksCount: number;
    orphanPagesCount: number;
    maxDepthReached: number;
    errorsEncountered: number;
    totalCreditsUsed: number;
    stats: any;
  };
  error?: string;
  startedAt: string;
  completedAt: string;
  duration: number; // in milliseconds
}

/**
 * Job progress update
 */
export interface CrawlJobProgress {
  phase: 'crawling' | 'sitemap' | 'analysis' | 'complete';
  pagesCrawled: number;
  pagesQueued: number;
  currentDepth: number;
  message: string;
}
