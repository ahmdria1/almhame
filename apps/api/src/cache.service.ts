import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { Kernel } from "./kernel";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis?: Redis;

  constructor(private readonly kernel: Kernel) {}

  private client(): Redis | null {
    if (!this.kernel.config.redisUrl || this.kernel.config.nodeEnv === "test") return null;
    if (!this.redis) {
      this.redis = new Redis(this.kernel.config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    }
    return this.redis;
  }

  async get(userId: string): Promise<string | null> {
    const redis = this.client();
    if (!redis) return null;
    try {
      if (redis.status === "wait") await redis.connect();
      return await redis.get(`me:${userId}`);
    } catch {
      return null;
    }
  }

  async set(userId: string, value: string) {
    const redis = this.client();
    if (!redis) return;
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.set(`me:${userId}`, value, "EX", 30);
    } catch {
      return;
    }
  }

  async drop(userId: string) {
    const redis = this.client();
    if (!redis) return;
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.del(`me:${userId}`);
    } catch {
      return;
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
