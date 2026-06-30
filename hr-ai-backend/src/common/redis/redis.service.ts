import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit() {
    this.redisClient = new Redis({
      host: this.config.redisHost,
      port: this.config.redisPort,
      // Optional: Add retry logic if needed for development
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    const key = `bl_${token}`;
    await this.redisClient.set(key, 'true', 'EX', expiresInSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `bl_${token}`;
    const result = await this.redisClient.get(key);
    return result === 'true';
  }

  async storeRefreshToken(token: string, expiresInSeconds: number): Promise<void> {
    const key = `rt_${token}`;
    await this.redisClient.set(key, 'true', 'EX', expiresInSeconds);
  }

  async isRefreshTokenValid(token: string): Promise<boolean> {
    const key = `rt_${token}`;
    const result = await this.redisClient.get(key);
    return result === 'true';
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const key = `rt_${token}`;
    await this.redisClient.del(key);
  }

  async setJson(key: string, value: unknown, expiresInSeconds: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', expiresInSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
