import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

// Expanded job data interface
export interface AuditJobData {
  url: string;
  userId: string;
  mode: 'single';
  options?: {
    timeout?: number;
    forceRecrawl?: boolean; // Force fresh crawl, ignore cache
    maxPages?: number;      // Max pages to crawl (default: 100)
  };
}

// Create the queue
export const auditQueue = new Queue<AuditJobData>('website-audit', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // 24 hours
    },
  },
});