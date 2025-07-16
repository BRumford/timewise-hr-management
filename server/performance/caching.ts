import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

class CachingLayer {
  private redis: RedisClientType | null = null;
  private inMemoryCache: Map<string, { data: any; expiry: number }> = new Map();
  private isRedisConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true,
          },
        });

        this.redis.on('error', (err) => {
          console.error('Redis connection error:', err);
          this.isRedisConnected = false;
        });

        this.redis.on('connect', () => {
          console.log('Redis connected successfully');
          this.isRedisConnected = true;
        });

        await this.redis.connect();
      } catch (error) {
        console.warn('Redis not available, falling back to in-memory cache:', error);
        this.isRedisConnected = false;
      }
    }
  }

  async get(key: string): Promise<any> {
    try {
      // Try Redis first
      if (this.isRedisConnected && this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Fallback to in-memory cache
      const memCached = this.inMemoryCache.get(key);
      if (memCached && memCached.expiry > Date.now()) {
        return memCached.data;
      }

      // Clean up expired entries
      if (memCached && memCached.expiry <= Date.now()) {
        this.inMemoryCache.delete(key);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis
      if (this.isRedisConnected && this.redis) {
        await this.redis.setEx(key, ttlSeconds, serializedValue);
      }

      // Set in in-memory cache as backup
      this.inMemoryCache.set(key, {
        data: value,
        expiry: Date.now() + ttlSeconds * 1000,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      }
      this.inMemoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushAll();
      }
      this.inMemoryCache.clear();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  // Cache middleware for Express routes
  middleware(ttlSeconds: number = 300) {
    return async (req: any, res: any, next: any) => {
      const key = `route:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      
      try {
        const cached = await this.get(key);
        if (cached) {
          return res.json(cached);
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data: any) {
          if (res.statusCode === 200) {
            cache.set(key, data, ttlSeconds);
          }
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Query result caching
  async cacheQuery(queryKey: string, queryFn: () => Promise<any>, ttlSeconds: number = 300): Promise<any> {
    const cached = await this.get(queryKey);
    if (cached) {
      return cached;
    }

    const result = await queryFn();
    await this.set(queryKey, result, ttlSeconds);
    return result;
  }
}

export const cache = new CachingLayer();