import type { ConnectionOptions } from "bullmq";
import { Redis } from 'ioredis';

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create a dedicated client for health checks
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true, // Don't connect immediately
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redisClient.connect();
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

// Listen to connection events
redisClient.on('connect', () => {
  console.log('✓ Redis connected');
});

redisClient.on('error', (err: Error) => {
  console.error('✗ Redis connection error:', err);
});

redisClient.on('close', () => {
  console.log('Redis connection closed');
});

export { redisClient };