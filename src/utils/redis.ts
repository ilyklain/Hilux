import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { HiluxRedisConfig } from "../config/config";

export class RedisManager {
  private client: Redis | null = null;
  private healthy = false;
  private readonly redisConfig: HiluxRedisConfig;

  constructor(redisConfig: HiluxRedisConfig) {
    this.redisConfig = redisConfig;
  }

  getClient(): Redis {
    if (!this.client) {
      if (this.redisConfig.enabled === false) {
        this.client = new RedisMock() as unknown as Redis;
        this.healthy = true;
        return this.client;
      }

      this.client = new Redis({
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        password: this.redisConfig.password,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times: number): number | null => {
          if (times > 5) {
            this.healthy = false;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on("connect", () => {
        this.healthy = true;
      });

      this.client.on("error", () => {
        this.healthy = false;
      });

      this.client.on("close", () => {
        this.healthy = false;
      });
    }
    return this.client;
  }

  async connect(): Promise<void> {
    const client = this.getClient();
    if (this.redisConfig.enabled !== false) {
      await client.connect();
    }
    this.healthy = true;
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  async close(): Promise<void> {
    if (this.client) {
      this.healthy = false;
      await this.client.quit();
      this.client = null;
    }
  }
}
