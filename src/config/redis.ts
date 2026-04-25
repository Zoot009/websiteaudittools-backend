import type { ConnectionOptions } from "bullmq";
import { Redis } from 'ioredis';
import 'dotenv/config'

// Helper function to parse Redis URL into ConnectionOptions
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1)) || 0 : 0,
    connectTimeout: 15000,
    keepAlive: 30000,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

// Redis connection configuration for BullMQ
export const redisConnection: ConnectionOptions = process.env.REDIS_URL
  ? parseRedisUrl(process.env.REDIS_URL)
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 15000,
      keepAlive: 30000,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    
// Create a dedicated client for health checks
const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      connectTimeout: 15000,
      keepAlive: 30000,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      tls: process.env.REDIS_URL.startsWith('rediss://')
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 15000,
      keepAlive: 30000,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

// Export as 'redis' for conversation memory service
export const redis = redisClient;

// Listen to connection events
redisClient.on('error', (err: Error) => {
  console.error('✗ Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redisClient.on('close', () => {
  console.log('Redis connection closed');
});

redisClient.on('reconnecting', (delay: number) => {
  console.warn(`Redis reconnecting in ${delay}ms`);
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

export { redisClient };