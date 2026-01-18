/**
 * Utility services: cache, rate limiting, metrics, version
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { DiffOptions, DiffResult } from './core.js';

// ============================================================================
// Version
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reads the version from package.json
 */
function getVersion(): string {
  try {
    const possiblePaths = [
      join(__dirname, '../../package.json'), // From dist/
      join(__dirname, '../package.json'),    // From src/ (dev)
      join(process.cwd(), 'package.json'),  // From project root
    ];

    for (const packagePath of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        continue;
      }
    }
    return '0.0.0';
  } catch (error) {
    return '0.0.0';
  }
}

export const VERSION = getVersion();

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  result: DiffResult;
  timestamp: number;
  expiresAt: number;
}

class DiffCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL: number = 5 * 60 * 1000; // 5 minutes default
  private readonly MAX_SIZE: number = 1000; // Maximum cache entries

  private generateKey(original: string, modified: string, options: DiffOptions): string {
    const normalized = JSON.stringify({
      original,
      modified,
      options: {
        granularity: options.granularity || 'line',
        ignoreWhitespace: options.ignoreWhitespace || false,
        ignoreCase: options.ignoreCase || false,
      },
    });
    return createHash('sha256').update(normalized).digest('hex');
  }

  get(original: string, modified: string, options: DiffOptions): DiffResult | null {
    const key = this.generateKey(original, modified, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(original: string, modified: string, options: DiffOptions, result: DiffResult, ttl?: number): void {
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    const key = this.generateKey(original, modified, options);
    const now = Date.now();
    const expiresAt = now + (ttl || this.TTL);

    this.cache.set(key, {
      result,
      timestamp: now,
      expiresAt,
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.MAX_SIZE,
    };
  }
}

export const diffCache = new DiffCache();

// Cleanup expired entries every minute
setInterval(() => {
  const cleaned = diffCache.cleanup();
  if (cleaned > 0) {
    console.log(`Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 60 * 1000);

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  getStats() {
    return {
      activeWindows: this.requests.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

export const diffRateLimiter = new RateLimiter(200, 60 * 1000); // 200 requests per minute
export const apiRateLimiter = new RateLimiter(1000, 60 * 1000); // 1000 requests per minute

// Cleanup expired rate limit entries every 5 minutes
setInterval(() => {
  diffRateLimiter.cleanup();
  apiRateLimiter.cleanup();
}, 5 * 60 * 1000);

// ============================================================================
// Metrics
// ============================================================================

interface MetricEntry {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();
  private readonly MAX_ENTRIES = 1000;

  record(endpoint: string, duration: number, isError: boolean = false): void {
    const entry = this.metrics.get(endpoint) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
    };

    entry.count++;
    entry.totalDuration += duration;
    entry.minDuration = Math.min(entry.minDuration, duration);
    entry.maxDuration = Math.max(entry.maxDuration, duration);
    if (isError) {
      entry.errors++;
    }

    this.metrics.set(endpoint, entry);

    if (this.metrics.size > this.MAX_ENTRIES) {
      const firstKey = this.metrics.keys().next().value;
      if (firstKey) {
        this.metrics.delete(firstKey);
      }
    }
  }

  get(endpoint: string): MetricEntry | null {
    return this.metrics.get(endpoint) || null;
  }

  getAll(): Record<string, MetricEntry & { avgDuration: number; errorRate: number }> {
    const result: Record<string, MetricEntry & { avgDuration: number; errorRate: number }> = {};

    for (const [endpoint, entry] of this.metrics.entries()) {
      result[endpoint] = {
        ...entry,
        avgDuration: entry.count > 0 ? entry.totalDuration / entry.count : 0,
        errorRate: entry.count > 0 ? (entry.errors / entry.count) * 100 : 0,
      };
    }

    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const metrics = new MetricsCollector();
