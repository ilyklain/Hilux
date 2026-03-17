import { HiluxConfig } from "../config/config";
import { RedisManager } from "./redis";
import { IpReputationInfo } from "../types/requestAnalysis";

const REPUTATION_PREFIX = "hilux:rep:";
const VIOLATIONS_PREFIX = "hilux:rep:violations:";
const REQUESTS_PREFIX = "hilux:rep:requests:";

export class ReputationManager {
  private readonly redis: RedisManager;
  private readonly cfg: HiluxConfig["reputation"];

  constructor(redis: RedisManager, reputation: HiluxConfig["reputation"]) {
    this.redis = redis;
    this.cfg = reputation;
  }

  async get(ip: string): Promise<IpReputationInfo | null> {
    if (!this.redis.isHealthy()) {
      return null;
    }

    const client = this.redis.getClient();
    const [scoreStr, violationsStr, requestsStr, lastSeenStr] = await client.mget(
      `${REPUTATION_PREFIX}${ip}`,
      `${VIOLATIONS_PREFIX}${ip}`,
      `${REQUESTS_PREFIX}${ip}`,
      `${REPUTATION_PREFIX}${ip}:lastseen`
    );

    if (!scoreStr && !violationsStr && !requestsStr) {
      return null;
    }

    const reputationScore = parseInt(scoreStr || "0", 10);

    return {
      ip,
      reputation_score: reputationScore,
      total_requests: parseInt(requestsStr || "0", 10),
      total_violations: parseInt(violationsStr || "0", 10),
      last_seen: parseInt(lastSeenStr || "0", 10),
      auto_blacklisted: reputationScore >= this.cfg.autoBlacklistThreshold,
    };
  }

  async record(ip: string, riskScore: number, suspiciousThreshold: number): Promise<void> {
    if (!this.redis.isHealthy()) {
      return;
    }

    const client = this.redis.getClient();
    const pipeline = client.pipeline();
    const now = Date.now();

    pipeline.incr(`${REQUESTS_PREFIX}${ip}`);
    pipeline.expire(`${REQUESTS_PREFIX}${ip}`, this.cfg.ttlSeconds);
    pipeline.set(
      `${REPUTATION_PREFIX}${ip}:lastseen`,
      now.toString(),
      "EX",
      this.cfg.ttlSeconds
    );

    if (riskScore >= suspiciousThreshold) {
      pipeline.incrby(`${REPUTATION_PREFIX}${ip}`, this.cfg.escalationStep);
      pipeline.expire(`${REPUTATION_PREFIX}${ip}`, this.cfg.ttlSeconds);
      pipeline.incr(`${VIOLATIONS_PREFIX}${ip}`);
      pipeline.expire(`${VIOLATIONS_PREFIX}${ip}`, this.cfg.ttlSeconds);
    }

    await pipeline.exec();
  }

  async getScore(ip: string): Promise<number> {
    if (!this.redis.isHealthy()) {
      return 0;
    }

    const client = this.redis.getClient();
    const scoreStr = await client.get(`${REPUTATION_PREFIX}${ip}`);
    return parseInt(scoreStr || "0", 10);
  }

  async reset(ip: string): Promise<void> {
    if (!this.redis.isHealthy()) {
      return;
    }

    const client = this.redis.getClient();
    await client.del(
      `${REPUTATION_PREFIX}${ip}`,
      `${VIOLATIONS_PREFIX}${ip}`,
      `${REQUESTS_PREFIX}${ip}`,
      `${REPUTATION_PREFIX}${ip}:lastseen`
    );
  }
}
