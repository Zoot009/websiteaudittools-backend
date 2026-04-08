import { Worker, Job } from 'bullmq';
import type { LinkGraphJobData } from '../queues/linkGraphQueue.js';
import { redisConnection } from '../config/redis.js';
import { crawlLinkGraph } from '../services/linkGraph/linkGraphCrawler.js';

async function processLinkGraph(job: Job<LinkGraphJobData>) {
  console.log(`
🔗 Starting link graph crawl job ${job.id} for ${job.data.url}
`);
  try {
    const { url, depth, options } = job.data;
    await job.updateProgress(0);    
    const linkGraph = await crawlLinkGraph(url, depth, options || {});
    await job.updateProgress(100);
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
});

linkGraphWorker.on('completed', (job) => console.log(`✅ Link graph job ${job.id} completed`));
linkGraphWorker.on('failed', (job, err) => console.error(`❌ Link graph job ${job?.id} failed:`, err.message));
linkGraphWorker.on('error', (err) => console.error('❌ Link graph worker error:', err));
console.log('🔗 Link graph worker started');
