/**
 * BullMQ worker to process crawl jobs in the background
 */

import { Worker, Job } from 'bullmq';
import { Crawler } from '../services/crawler.js';
import { analyzeLinkGraph, getLinkGraphStats } from '../services/linkAnalyzer.js';
import { 
  createCrawlJob, 
  saveCrawlResults, 
  updateCrawlJobStatus,
  getCrawlJobCredits 
} from '../services/database.js';
import { redisConnection } from '../../../../config/redis.js';
import { CRAWL_QUEUE_NAME } from './config.js';
import type { CrawlJobData, CrawlJobResult, CrawlJobProgress } from './types.js';
import type { CrawlerConfig } from '../types.js';

/**
 * Process a single crawl job
 */
async function processCrawlJob(job: Job<CrawlJobData>): Promise<CrawlJobResult> {
  const startTime = new Date();
  
  try {
    const { url, scrapeDoToken, maxPages = 500, maxDepth = 5, rateLimit = 500 } = job.data;

    // Create database record for this crawl job
    await createCrawlJob(job.id!, url, { maxPages, maxDepth, rateLimit });

    // Update job progress - starting
    await job.updateProgress({
      phase: 'crawling',
      pagesCrawled: 0,
      pagesQueued: 1,
      currentDepth: 0,
      message: 'Starting crawl...',
    } as CrawlJobProgress);

    // Validate token
    if (!scrapeDoToken) {
      throw new Error('scrape.do token is required');
    }

    // Create crawler configuration
    const config: CrawlerConfig = {
      baseUrl: url,
      scrapeDoToken,
      maxPages,
      maxDepth,
      delayMs: rateLimit,
      ...(job.id ? { jobId: job.id } : {}), // Pass jobId for credit tracking
    };

    console.log(`[Job ${job.id}] Starting crawl for: ${url}`);
    console.log(`[Job ${job.id}] Config: maxPages=${maxPages}, maxDepth=${maxDepth}, delayMs=${rateLimit}`);

    // Update progress - crawling phase
    await job.updateProgress({
      phase: 'crawling',
      pagesCrawled: 0,
      pagesQueued: 0,
      currentDepth: 0,
      message: 'Crawling pages...',
    } as CrawlJobProgress);

    // Create and run the crawler
    const crawler = new Crawler(config);
    const { linkMap, metadata, sitemapUrls } = await crawler.crawl();

    // Update progress - sitemap phase
    await job.updateProgress({
      phase: 'sitemap',
      pagesCrawled: metadata.totalPagesCrawled,
      pagesQueued: 0,
      currentDepth: metadata.maxDepthReached,
      message: `Processing sitemap (${sitemapUrls.length} URLs)...`,
    } as CrawlJobProgress);

    // Update progress - analysis phase
    await job.updateProgress({
      phase: 'analysis',
      pagesCrawled: metadata.totalPagesCrawled,
      pagesQueued: 0,
      currentDepth: metadata.maxDepthReached,
      message: 'Analyzing link graph...',
    } as CrawlJobProgress);

    // Analyze the link graph
    const analysis = analyzeLinkGraph(linkMap, sitemapUrls, metadata);

    // Get additional statistics
    const stats = getLinkGraphStats(analysis.linkGraph, analysis.inboundLinksCount);

    // Update progress - complete
    await job.updateProgress({
      phase: 'complete',
      pagesCrawled: metadata.totalPagesCrawled,
      pagesQueued: 0,
      currentDepth: metadata.maxDepthReached,
      message: 'Analysis complete',
    } as CrawlJobProgress);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`[Job ${job.id}] Analysis complete for: ${url}`);
    console.log(`[Job ${job.id}] Pages crawled: ${metadata.totalPagesCrawled}, Orphans: ${analysis.orphanPages.length}, Duration: ${duration}ms`);

    // Get total credits used from the database
    const creditInfo = await getCrawlJobCredits(job.id!);
    const totalCreditsUsed = creditInfo?.totalCredits || 0;

    // Save results to database
    await saveCrawlResults(
      job.id!,
      analysis.linkGraph,
      analysis.inboundLinksCount,
      analysis.orphanPages,
      metadata,
      totalCreditsUsed
    );

    // Return only a summary to avoid Redis size limits
    // Full data is already saved to database and can be retrieved from there
    const resultData: CrawlJobResult = {
      success: true,
      summary: {
        url: config.baseUrl,
        pagesCrawled: metadata.totalPagesCrawled,
        pagesInSitemap: metadata.totalPagesInSitemap,
        internalLinksCount: Object.keys(analysis.linkGraph).length,
        orphanPagesCount: analysis.orphanPages.length,
        maxDepthReached: metadata.maxDepthReached,
        errorsEncountered: metadata.errorsEncountered,
        totalCreditsUsed,
        stats,
      },
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      duration,
    };

    return resultData;
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.error(`[Job ${job.id}] Error during crawl:`, error);

    // Update job status to failed in database
    try {
      await updateCrawlJobStatus(
        job.id!,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (dbError) {
      console.error(`[Job ${job.id}] Failed to update job status in database:`, dbError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      duration,
    };
  }
}

/**
 * Create and start the worker
 */
export function createCrawlWorker(concurrency = 2): Worker<CrawlJobData, CrawlJobResult> {
  const worker = new Worker<CrawlJobData, CrawlJobResult>(
    CRAWL_QUEUE_NAME,
    processCrawlJob,
    {
      connection: redisConnection,
      concurrency, // Process multiple jobs concurrently
      limiter: {
        max: concurrency, // Max jobs per duration
        duration: 1000, // 1 second
      },
    }
  );

  // Worker event handlers
  worker.on('ready', () => {
    console.log(`🔧 Worker ready (concurrency: ${concurrency})`);
  });

  worker.on('active', (job) => {
    console.log(`⚙️  Processing job ${job.id}...`);
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  return worker;
}

/**
 * Graceful shutdown of worker
 */
export async function closeWorker(worker: Worker) {
  await worker.close();
  console.log('Worker closed gracefully');
}
