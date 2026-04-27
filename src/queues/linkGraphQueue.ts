import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

/**
 * Link graph job data
 */
export interface LinkGraphJobData {
  url: string;
  depth: number;
  options?: {
    stripTracking?: boolean;
    maxPages?: number;
    maxTimeMs?: number;
    timeout?: number;
    seedFromSitemap?: boolean;
  };
}

/**
 * Create the link graph queue
 */
export const linkGraphQueue = new Queue<LinkGraphJobData>('link-graph-crawl', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,  // Fewer retries than audit (link graphs are optional)
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 50,
    },
    removeOnFail: {
      age: 7200, // Keep failed jobs for 2 hours
    },
    // Hard ceiling: kills a job that somehow stalls past 35 minutes
    // (worker maxTimeMs is 30 min + 5 min buffer for sitemap fetch / post-processing)
    jobTimeout: 35 * 60 * 1000,
  },
});
