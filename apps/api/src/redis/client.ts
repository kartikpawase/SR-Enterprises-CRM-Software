import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redisInstance: any = null;

// Built-in in-memory fallback store for development/offline environments
class InMemoryRedisFallback {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private setStore = new Map<string, Set<string>>();

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let ttlSeconds: number | undefined;
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === 'string' && args[i].toUpperCase() === 'EX' && typeof args[i + 1] === 'number') {
        ttlSeconds = args[i + 1];
        break;
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
    this.store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      if (this.setStore.delete(key)) count++;
    }
    return count;
  }

  async getdel(key: string): Promise<string | null> {
    const val = await this.get(key);
    this.store.delete(key);
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (item.expiresAt === Infinity) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const num = current ? parseInt(current, 10) + 1 : 1;
    const item = this.store.get(key);
    const expiresAt = item ? item.expiresAt : Infinity;
    this.store.set(key, { value: String(num), expiresAt });
    return num;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.setStore.get(key);
    if (!set) {
      set = new Set<string>();
      this.setStore.set(key, set);
    }
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.setStore.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed++;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.setStore.get(key);
    return set ? Array.from(set) : [];
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  get status(): string {
    return 'ready';
  }

  pipeline() {
    const operations: Array<() => Promise<any>> = [];
    const proxy = {
      get: (key: string) => {
        operations.push(() => this.get(key));
        return proxy;
      },
      del: (key: string) => {
        operations.push(() => this.del(key));
        return proxy;
      },
      set: (key: string, value: string, ...args: any[]) => {
        operations.push(() => this.set(key, value, ...args));
        return proxy;
      },
      exec: async () => {
        const results: any[] = [];
        for (const op of operations) {
          const res = await op();
          results.push([null, res]);
        }
        return results;
      },
    };
    return proxy;
  }

  on(_event: string, _handler: Function) {
    return this;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  disconnect() {}
}

const inMemoryFallback: InMemoryRedisFallback =
  (globalThis as any).__crm_redis_fallback__ || new InMemoryRedisFallback();
(globalThis as any).__crm_redis_fallback__ = inMemoryFallback;

/**
 * Resilient Redis proxy that seamlessly falls back to in-memory store if Redis is unavailable
 */
class ResilientRedisProxy {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        retryStrategy(times) {
          if (env.NODE_ENV === 'test') {
            return null;
          }
          return Math.min(times * 250, 3000);
        },
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (_err) => {
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  get status(): string {
    return this.isConnected && this.client ? this.client.status : 'ready';
  }

  private async execute<T>(fn: (client: Redis) => Promise<T>, fallbackFn: () => Promise<T>): Promise<T> {
    if (this.isConnected && this.client) {
      try {
        return await fn(this.client);
      } catch {
        this.isConnected = false;
        return await fallbackFn();
      }
    }
    return await fallbackFn();
  }

  async set(key: string, value: string, ...args: any[]): Promise<any> {
    return this.execute(
      (c) => (c as any).set(key, value, ...args),
      () => inMemoryFallback.set(key, value, ...args)
    );
  }

  async get(key: string): Promise<string | null> {
    return this.execute(
      (c) => c.get(key),
      () => inMemoryFallback.get(key)
    );
  }

  async del(...keys: string[]): Promise<number> {
    return this.execute(
      (c) => c.del(...keys),
      () => inMemoryFallback.del(...keys)
    );
  }

  async getdel(key: string): Promise<string | null> {
    return this.execute(
      async (c) => {
        try {
          return await (c as any).getdel(key);
        } catch (err: any) {
          // If Redis server does not support GETDEL (e.g. Redis < 6.2), fallback to atomic pipeline get + del
          if (err?.message?.includes?.('unknown command')) {
            const pipe = c.pipeline();
            pipe.get(key);
            pipe.del(key);
            const res = await pipe.exec();
            return (res?.[0]?.[1] as string) ?? null;
          }
          throw err;
        }
      },
      () => inMemoryFallback.getdel(key)
    );
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.execute(
      (c) => c.expire(key, seconds),
      () => inMemoryFallback.expire(key, seconds)
    );
  }

  async ttl(key: string): Promise<number> {
    return this.execute(
      (c) => c.ttl(key),
      () => inMemoryFallback.ttl(key)
    );
  }

  async incr(key: string): Promise<number> {
    return this.execute(
      (c) => c.incr(key),
      () => inMemoryFallback.incr(key)
    );
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.execute(
      (c) => c.sadd(key, ...members),
      () => inMemoryFallback.sadd(key, ...members)
    );
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.execute(
      (c) => c.srem(key, ...members),
      () => inMemoryFallback.srem(key, ...members)
    );
  }

  async smembers(key: string): Promise<string[]> {
    return this.execute(
      (c) => c.smembers(key),
      () => inMemoryFallback.smembers(key)
    );
  }

  async ping(): Promise<string> {
    return this.execute(
      (c) => c.ping(),
      () => inMemoryFallback.ping()
    );
  }

  pipeline() {
    if (this.isConnected && this.client) {
      return this.client.pipeline();
    }
    return inMemoryFallback.pipeline();
  }

  on(event: string, handler: Function) {
    if (this.client) {
      this.client.on(event as any, handler as any);
    }
    return this;
  }

  async quit(): Promise<any> {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
    }
    return 'OK';
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}

/**
 * Get or initialize singleton Redis client with in-memory resiliency
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new ResilientRedisProxy() as unknown as Redis;
  }
  return redisInstance;
}

export const redis = getRedisClient();

/**
 * Graceful close of Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    await (redisInstance as any).quit().catch(() => {});
    redisInstance = null;
  }
}
