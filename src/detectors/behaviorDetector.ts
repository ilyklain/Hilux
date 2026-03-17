import { DetectorResult, BehaviorProfile } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";
import { RedisManager } from "../utils/redis";

const PATHS_KEY = "hilux:behavior:paths:";
const TIMESTAMPS_KEY = "hilux:behavior:ts:";

export async function detectBehavior(
  ip: string,
  path: string,
  redis: RedisManager,
  cfg: HiluxConfig
): Promise<DetectorResult> {
  if (!redis.isHealthy()) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const client = redis.getClient();
  const now = Date.now();
  const windowMs = cfg.behavior.windowSeconds * 1000;

  const pipeline = client.pipeline();
  pipeline.sadd(`${PATHS_KEY}${ip}`, path);
  pipeline.expire(`${PATHS_KEY}${ip}`, cfg.behavior.windowSeconds + 10);
  pipeline.scard(`${PATHS_KEY}${ip}`);
  pipeline.zadd(`${TIMESTAMPS_KEY}${ip}`, now.toString(), now.toString());
  pipeline.zremrangebyscore(`${TIMESTAMPS_KEY}${ip}`, "-inf", (now - windowMs).toString());
  pipeline.zrange(`${TIMESTAMPS_KEY}${ip}`, 0, -1);
  pipeline.expire(`${TIMESTAMPS_KEY}${ip}`, cfg.behavior.windowSeconds + 10);

  const results = await pipeline.exec();
  if (!results) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const uniquePaths = results[2]?.[1] as number;
  const timestamps = (results[5]?.[1] as string[]) || [];

  if (timestamps.length < cfg.behavior.minRequestsForAnalysis) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const profile = analyzeBehavior(uniquePaths, timestamps, cfg);
  const anomalies: string[] = [];
  let score = 0;

  if (uniquePaths > cfg.behavior.maxPaths) {
    anomalies.push(`High path diversity: ${uniquePaths} unique paths`);
    score += 12;
  }

  if (profile.is_regular && timestamps.length >= cfg.behavior.minRequestsForAnalysis) {
    anomalies.push(
      `Regular request interval: ~${Math.round(profile.avg_interval_ms)}ms (variance: ${Math.round(profile.request_interval_variance)}ms)`
    );
    score += 13;
  }

  if (score === 0) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const finalScore = Math.min(score, cfg.scoring.behaviorAnomaly);

  return {
    detector: "behavior",
    score: finalScore,
    reason: `Behavior anomalies: ${anomalies.join("; ")}`,
  };
}

function analyzeBehavior(
  uniquePaths: number,
  timestamps: string[],
  cfg: HiluxConfig
): BehaviorProfile {
  const times = timestamps.map(Number).sort((a, b) => a - b);

  if (times.length < 2) {
    return {
      unique_paths: uniquePaths,
      request_interval_variance: Infinity,
      avg_interval_ms: 0,
      is_regular: false,
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < times.length; i++) {
    intervals.push(times[i] - times[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);

  const isRegular = stdDev < cfg.behavior.regularIntervalThresholdMs && avgInterval > 0;

  return {
    unique_paths: uniquePaths,
    request_interval_variance: stdDev,
    avg_interval_ms: avgInterval,
    is_regular: isRegular,
  };
}
