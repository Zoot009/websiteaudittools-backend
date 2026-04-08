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
  },
});
