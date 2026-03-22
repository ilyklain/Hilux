import geoip from "geoip-lite";
import {
  HiluxConfig,
  DeepPartial,
  buildConfig,
} from "./config/config";
import { RedisManager } from "./utils/redis";
import { DatabaseManager } from "./utils/database";
import { ReputationManager } from "./utils/ipReputation";
import { analyzeRequest } from "./middleware/botGuard";
import {
  AnalysisRequest,
  AnalysisResult,
  DetectionStats,
  TopOffender,
  DetectorBreakdown,
  TimeSeriesBucket,
  BlacklistEntry,
  IpReputationInfo,
  HealthStatus,
} from "./types/requestAnalysis";

export class Hilux {
  readonly config: HiluxConfig;
  readonly redis: RedisManager;
  readonly db: DatabaseManager;
  readonly reputation: ReputationManager;
  private connected = false;

  constructor(overrides?: DeepPartial<HiluxConfig>) {
    this.config = buildConfig(overrides);
    this.redis = new RedisManager(this.config.redis);
    this.db = new DatabaseManager(this.config.postgres, this.config.thresholds);
    this.reputation = new ReputationManager(this.redis, this.config.reputation);
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.db.init();
    this.connected = true;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    return analyzeRequest(request, this.config, this.redis, this.db, this.reputation);
  }

  async getStats(): Promise<DetectionStats> {
    return this.db.getStats();
  }

  async getTopOffenders(limit?: number): Promise<any[]> {
    const offenders = await this.db.getTopOffenders(limit);
    return offenders.map(off => {
      const geo = geoip.lookup(off.ip);
      return {
        ...off,
        geo: geo ? {
          country: geo.country,
          city: geo.city,
          ll: [geo.ll[1], geo.ll[0]]
        } : null
      };
    });
  }

  async getDetectorBreakdown(): Promise<DetectorBreakdown[]> {
    return this.db.getDetectorBreakdown();
  }

  async getTimeSeries(intervalMinutes?: number, limitBuckets?: number): Promise<TimeSeriesBucket[]> {
    return this.db.getTimeSeries(intervalMinutes, limitBuckets);
  }

  async addToBlacklist(ip: string, reason: string, durationSeconds?: number): Promise<void> {
    if (this.config.plugin.webhookUrl && this.config.plugin.webhookEvents?.onBan) {
      fetch(this.config.plugin.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Hilux IP Banned: ${ip}\nReason: ${reason}`
        })
      }).catch(err => console.error("Webhook dispatch failed", err));
    }
    return this.db.addToBlacklist(ip, reason, durationSeconds);
  }

  async removeFromBlacklist(ip: string): Promise<boolean> {
    return this.db.removeFromBlacklist(ip);
  }

  async isBlacklisted(ip: string): Promise<boolean> {
    return this.db.isBlacklisted(ip);
  }

  async getBlacklist(): Promise<BlacklistEntry[]> {
    return this.db.getBlacklist();
  }

  async getReputation(ip: string): Promise<IpReputationInfo | null> {
    return this.reputation.get(ip);
  }

  async resetReputation(ip: string): Promise<void> {
    return this.reputation.reset(ip);
  }

  async health(): Promise<HealthStatus> {
    const [pgHealthy, redisHealthy] = await Promise.all([
      this.db.isHealthy(),
      Promise.resolve(this.redis.isHealthy()),
    ]);

    return {
      status: pgHealthy ? "ok" : "degraded",
      service: "hilux",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      redis: { connected: redisHealthy },
      postgres: { connected: pgHealthy },
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    await this.redis.close();
    await this.db.close();
  }
}
