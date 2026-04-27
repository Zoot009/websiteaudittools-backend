/**
 * Redis connection configuration for Upstash or local Redis
 * Uses ioredis for compatibility with BullMQ
 */

import {Redis} from 'ioredis';
import 'dotenv/config';

/**
 * Create Redis connection
 * Supports both REDIS_URL (for Upstash) and individual host/port/password
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Using Redis URL (works with Upstash rediss:// URLs)
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // TLS configuration for rediss:// URLs
      tls: redisUrl.startsWith('rediss://') ? {
        rejectUnauthorized: false // Upstash uses self-signed certificates
      } : undefined,
    });
  } else {
    // Using individual host/port/password
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
}

// Create a singleton Redis connection
export const redis = createRedisConnection();

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('ready', () => {
  console.log('✅ Redis is ready');
});

// Graceful shutdown
export async function closeRedis() {
  await redis.quit();
  console.log('✅ Redis connection closed');
}
