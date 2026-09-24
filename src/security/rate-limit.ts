import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memoryStore = new Map<string, { count: number; resetTime: number }>();

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!upstashLimiter) {
    const redis = Redis.fromEnv();
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: true,
    });
  }

  return upstashLimiter;
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function checkRateLimit(
  key: string,
  limit = 100,
  windowMs = 60000
): Promise<boolean> {
  const upstash = getUpstashLimiter(limit, windowMs);

  if (upstash) {
    const result = await upstash.limit(key);
    return result.success;
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}

export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
}
