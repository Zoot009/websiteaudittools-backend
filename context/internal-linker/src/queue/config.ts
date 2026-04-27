/**
 * BullMQ queue configuration and initialization
 */

import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../utils/redis.js';

// Queue name
export const CRAWL_QUEUE_NAME = 'internal-linking-crawl';

// Create the crawl queue using the Redis connection
export const crawlQueue = new Queue(CRAWL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1, // Don't retry failed jobs automatically
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const crawlQueueEvents = new QueueEvents(CRAWL_QUEUE_NAME, {
  connection: redis.duplicate(), // Use duplicate connection for events
});

// Log queue events
crawlQueueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Job ${jobId} completed`);
});

crawlQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed: ${failedReason}`);
});

crawlQueueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Job ${jobId} progress:`, data);
});

// Graceful shutdown
export async function closeQueue() {
  await crawlQueue.close();
  await crawlQueueEvents.close();
  console.log('✅ Queue closed gracefully');
}
