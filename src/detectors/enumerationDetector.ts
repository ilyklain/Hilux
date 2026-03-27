/**
 * Hilux API Enumeration Detector
 *
 * Detects sequential resource scraping patterns such as:
 *   /api/users/1, /api/users/2, /api/users/3 ...
 *   /products?page=1, /products?page=2, /products?page=3 ...
 *
 * It works by extracting numeric segments from request paths
 * and tracking their sequential progression per IP.
 */

import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";
import { RedisManager } from "../utils/redis";

const ENUM_KEY = "hilux:enum:";

function extractNumericSegments(path: string): number[] {
  const segments = path.split(/[\/\?&=]/).filter(Boolean);
  const numbers: number[] = [];
  for (const seg of segments) {
    const n = parseInt(seg, 10);
    if (!isNaN(n) && n >= 0 && n < 100000000) {
      numbers.push(n);
    }
  }
  return numbers;
}

function extractBasePath(path: string): string {
  return path.replace(/\/\d+/g, "/{id}").replace(/[?&]\w+=\d+/g, "").replace(/\/+$/, "") || "/";
}

export async function detectEnumeration(
  ip: string,
  path: string,
  redis: RedisManager,
  cfg: HiluxConfig
): Promise<DetectorResult> {
  if (!redis.isHealthy()) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const numbers = extractNumericSegments(path);
  if (numbers.length === 0) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const basePath = extractBasePath(path);
  const key = `${ENUM_KEY}${ip}:${basePath}`;
  const windowSeconds = cfg.behavior.windowSeconds || 60;

  const client = redis.getClient();
  const now = Date.now();

  const pipeline = client.pipeline();
  for (const num of numbers) {
    pipeline.zadd(key, now.toString(), num.toString());
  }
  pipeline.zremrangebyscore(key, "-inf", (now - windowSeconds * 1000).toString());
  pipeline.zrangebyscore(key, "-inf", "+inf");
  pipeline.expire(key, windowSeconds + 10);

  const results = await pipeline.exec();
  if (!results) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const storedValues = results[results.length - 2]?.[1] as string[];
  if (!storedValues || storedValues.length < 5) {
    return { detector: "behavior", score: 0, reason: null };
  }

  const sortedNums = storedValues.map(Number).sort((a, b) => a - b);

  let sequentialCount = 0;
  let maxSequentialRun = 0;
  let currentRun = 1;

  for (let i = 1; i < sortedNums.length; i++) {
    const diff = sortedNums[i] - sortedNums[i - 1];
    if (diff === 1) {
      currentRun++;
      maxSequentialRun = Math.max(maxSequentialRun, currentRun);
    } else if (diff === 0) {
      continue;
    } else {
      currentRun = 1;
    }
  }
  sequentialCount = maxSequentialRun;

  if (sequentialCount < 5) {
    return { detector: "behavior", score: 0, reason: null };
  }

  let score = 0;
  if (sequentialCount >= 20) {
    score = 40;
  } else if (sequentialCount >= 10) {
    score = 30;
  } else if (sequentialCount >= 5) {
    score = 20;
  }

  return {
    detector: "behavior",
    score: Math.min(score, cfg.scoring.behaviorAnomaly),
    reason: `API Enumeration: ${sequentialCount} sequential IDs on ${basePath} (${sortedNums[0]}..${sortedNums[sortedNums.length - 1]})`,
  };
}
