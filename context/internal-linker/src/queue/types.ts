/**
 * Job types for BullMQ
 */

import type { InternalLinkAnalysisResponse } from '../types.js';

export type CrawlJobType = 'crawl-analysis' | 'connected-pages';

/**
 * Job data for crawl requests
 */
export interface CrawlJobData {
  url: string;
  targetUrl?: string;
  jobType?: CrawlJobType;
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
    jobType?: CrawlJobType;
    url: string;
    targetUrl?: string;
    connectedPagesCount?: number;
    targetFound?: boolean;
    totalPagesChecked?: number;
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
  phase: 'crawling' | 'sitemap' | 'analysis' | 'connected-pages' | 'complete';
  pagesCrawled: number;
  pagesQueued: number;
  currentDepth: number;
  message: string;
}
