import { Worker, Job } from 'bullmq';
import type { LinkGraphJobData } from '../queues/linkGraphQueue.js';
import { redisConnection } from '../config/redis.js';
import { crawlLinkGraph } from '../services/linkGraph/linkGraphCrawler.js';

async function processLinkGraph(job: Job<LinkGraphJobData>) {
  console.log(`🔗 Starting link graph crawl job ${job.id} for ${job.data.url}`);
  try {
    const { url, depth, options } = job.data;
    const maxPages = options?.maxPages ?? 500;
    // Background jobs are not bound by an HTTP request timeout — use 30 minutes
    // so large sites can be fully crawled. Callers can lower this via options.maxTimeMs.
    const maxTimeMs = options?.maxTimeMs ?? 30 * 60 * 1000;

    await job.updateProgress({ pct: 0, phase: 'starting', pagesVisited: 0, maxPages });

    const linkGraph = await crawlLinkGraph(url, depth, {
      ...(options || {}),
      maxTimeMs,
      onProgress: (pagesVisited, max) => {
        const pct = Math.min(99, Math.round((pagesVisited / max) * 100));
        job.updateProgress({ pct, phase: 'crawling', pagesVisited, maxPages: max });
      },
    });

    await job.updateProgress({ pct: 100, phase: 'complete', pagesVisited: linkGraph.stats.pages_crawled, maxPages });
    console.log(`✅ Link graph completed: ${linkGraph.stats.pages_crawled} pages, ${linkGraph.stats.edges} edges`);
    return linkGraph;
  } catch (error: any) {
    console.error(`❌ Link graph crawl failed for job ${job.id}:`, error);
    throw error;
  }
}

export const linkGraphWorker = new Worker<LinkGraphJobData>('link-graph-crawl', processLinkGraph, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 10, duration: 60000 },
  // Lock must outlive each page-fetch cycle. BullMQ auto-renews at lockDuration/2,
  // so 60 s gives a 30 s renewal window — safe for the 2-5 s per-page rate limiter.
  lockDuration: 60000,
});

linkGraphWorker.on('completed', (job) => console.log(`✅ Link graph job ${job.id} completed`));
linkGraphWorker.on('failed', (job, err) => console.error(`❌ Link graph job ${job?.id} failed:`, err.message));
linkGraphWorker.on('error', (err) => console.error('❌ Link graph worker error:', err));
console.log('🔗 Link graph worker started');
