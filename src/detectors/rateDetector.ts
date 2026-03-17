import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";
import { RedisManager } from "../utils/redis";

export async function detectRate(
  ip: string,
  redis: RedisManager,
  cfg: HiluxConfig
): Promise<DetectorResult> {
  if (!redis.isHealthy()) {
    return { detector: "rate", score: 0, reason: null };
  }

  const client = redis.getClient();
  const now = Date.now();
  const windowKey = `hilux:rate:window:${ip}`;
  const burstKey = `hilux:rate:burst:${ip}`;

  const pipeline = client.pipeline();
  pipeline.zadd(windowKey, now.toString(), `${now}:${Math.random()}`);
  pipeline.zremrangebyscore(windowKey, "-inf", (now - cfg.rateLimit.window * 1000).toString());
  pipeline.zcard(windowKey);
  pipeline.expire(windowKey, cfg.rateLimit.window + 10);
  pipeline.zadd(burstKey, now.toString(), `${now}:${Math.random()}`);
  pipeline.zremrangebyscore(burstKey, "-inf", (now - cfg.rateLimit.burstWindow * 1000).toString());
  pipeline.zcard(burstKey);
  pipeline.expire(burstKey, cfg.rateLimit.burstWindow + 10);

  const results = await pipeline.exec();
  if (!results) {
    return { detector: "rate", score: 0, reason: null };
  }

  const windowCount = results[2]?.[1] as number;
  const burstCount = results[6]?.[1] as number;

  if (burstCount > cfg.rateLimit.burstMax) {
    return {
      detector: "rate",
      score: cfg.scoring.rateLimitBurst,
      reason: `Burst rate limit exceeded: ${burstCount} requests in ${cfg.rateLimit.burstWindow}s`,
    };
  }

  if (windowCount > cfg.rateLimit.max * 2) {
    return {
      detector: "rate",
      score: cfg.scoring.rateLimitHigh,
      reason: `Heavy rate limit exceeded: ${windowCount} requests in ${cfg.rateLimit.window}s`,
    };
  }

  if (windowCount > cfg.rateLimit.max) {
    return {
      detector: "rate",
      score: cfg.scoring.rateLimitMild,
      reason: `Rate limit exceeded: ${windowCount} requests in ${cfg.rateLimit.window}s`,
    };
  }

  return { detector: "rate", score: 0, reason: null };
}
