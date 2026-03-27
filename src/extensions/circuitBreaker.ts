import { RedisManager } from "../utils/redis";

export interface CircuitBreakerConfig {
  enabled: boolean;
  windowSeconds: number;
  blockThreshold: number;
  cooldownSeconds: number;
  allowWhitelistedOnly: boolean;
}

const CB_COUNTER_KEY = "hilux:cb:blocks";
const CB_STATE_KEY = "hilux:cb:state";

export class CircuitBreaker {
  private redis: RedisManager;
  private config: CircuitBreakerConfig;
  private localState: "closed" | "open" = "closed";
  private localOpenedAt: number = 0;

  constructor(redis: RedisManager, config: CircuitBreakerConfig) {
    this.redis = redis;
    this.config = config;
  }

  async recordBlock(): Promise<void> {
    if (!this.config.enabled || !this.redis.isHealthy()) return;

    const client = this.redis.getClient();
    const now = Date.now();
    const windowStart = now - this.config.windowSeconds * 1000;

    const pipeline = client.pipeline();
    pipeline.zadd(CB_COUNTER_KEY, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
    pipeline.zremrangebyscore(CB_COUNTER_KEY, "-inf", windowStart.toString());
    pipeline.zcard(CB_COUNTER_KEY);
    pipeline.expire(CB_COUNTER_KEY, this.config.windowSeconds + 60);

    const results = await pipeline.exec();
    if (!results) return;

    const blockCount = results[2]?.[1] as number;

    if (blockCount >= this.config.blockThreshold) {
      await this.open();
    }
  }

  async isOpen(): Promise<boolean> {
    if (!this.config.enabled) return false;

    if (this.localState === "open") {
      const elapsed = Date.now() - this.localOpenedAt;
      if (elapsed >= this.config.cooldownSeconds * 1000) {
        await this.close();
        return false;
      }
      return true;
    }

    if (!this.redis.isHealthy()) return false;

    const state = await this.redis.get(CB_STATE_KEY).catch(() => null);
    if (state === "open") {
      this.localState = "open";
      this.localOpenedAt = Date.now();
      return true;
    }

    return false;
  }

  private async open(): Promise<void> {
    this.localState = "open";
    this.localOpenedAt = Date.now();

    if (this.redis.isHealthy()) {
      await this.redis.set(CB_STATE_KEY, "open", this.config.cooldownSeconds).catch(() => { });
    }

    console.warn(
      `[Circuit Breaker] OPEN - Attack volume exceeded ${this.config.blockThreshold} blocks in ${this.config.windowSeconds}s. ` +
      `Lockdown active for ${this.config.cooldownSeconds}s.`
    );
  }

  private async close(): Promise<void> {
    this.localState = "closed";
    this.localOpenedAt = 0;

    if (this.redis.isHealthy()) {
      const client = this.redis.getClient();
      await client.del(CB_STATE_KEY).catch(() => { });
    }

    console.info("[Circuit Breaker] CLOSED - Attack subsided. Normal traffic flow resumed.");
  }

  getState(): "open" | "closed" {
    return this.localState;
  }
}
