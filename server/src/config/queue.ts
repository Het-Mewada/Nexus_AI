import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from './env';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Sync portfolio values (e.g. live prices)
export const portfolioSyncQueue = new Queue('portfolioSync', {
  connection: redisConnection as any,
});

// Process liabilities (e.g. loans, EMIs, credit card bills)
export const liabilitySyncQueue = new Queue('liabilitySync', {
  connection: redisConnection as any,
});

// AI CFO periodic analysis
export const aiCfoQueue = new Queue('aiCfoSync', {
  connection: redisConnection as any,
});
