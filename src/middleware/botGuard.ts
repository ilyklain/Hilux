import {
  AnalysisRequest,
  AnalysisResult,
  DetectorResult,
} from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";
import { RedisManager } from "../utils/redis";
import { DatabaseManager } from "../utils/database";
import { ReputationManager } from "../utils/ipReputation";
import { detectRate } from "../detectors/rateDetector";
import { detectUserAgent } from "../detectors/userAgentDetector";
import { detectHeaders } from "../detectors/headerDetector";
import { detectIp } from "../detectors/ipDetector";
import { detectFingerprint } from "../detectors/fingerprintDetector";
import { detectPayload } from "../detectors/payloadDetector";
import { detectBehavior } from "../detectors/behaviorDetector";
import { calculateRiskScore, classifyRisk } from "../utils/riskScore";

async function runReputationDetector(
  ip: string,
  reputation: ReputationManager,
  cfg: HiluxConfig
): Promise<DetectorResult> {
  const repScore = await reputation.getScore(ip);

  if (repScore >= cfg.reputation.autoBlacklistThreshold) {
    return {
      detector: "reputation",
      score: cfg.scoring.reputationCritical,
      reason: `Critical IP reputation: ${repScore} (auto-blacklist threshold)`,
    };
  }

  if (repScore >= 100) {
    return {
      detector: "reputation",
      score: cfg.scoring.reputationBad,
      reason: `Bad IP reputation score: ${repScore}`,
    };
  }

  if (repScore >= 50) {
    return {
      detector: "reputation",
      score: cfg.scoring.reputationLow,
      reason: `Low IP reputation score: ${repScore}`,
    };
  }

  return { detector: "reputation", score: 0, reason: null };
}

export async function analyzeRequest(
  request: AnalysisRequest,
  cfg: HiluxConfig,
  redis: RedisManager,
  db: DatabaseManager,
  reputation: ReputationManager
): Promise<AnalysisResult> {
  if (cfg.whitelistedIps.includes(request.ip)) {
    return {
      bot: false,
      risk_score: 0,
      classification: "allow",
      confidence: 100,
      reasons: [],
      threat_breakdown: [],
    };
  }

  const blacklisted = await db.isBlacklisted(request.ip);
  if (blacklisted) {
    const result: AnalysisResult = {
      bot: true,
      risk_score: 150,
      classification: "block",
      confidence: 100,
      reasons: ["IP is blacklisted"],
      threat_breakdown: [
        { detector: "ip", score: 150, reason: "IP is blacklisted" },
      ],
    };

    await db.saveLog({
      ip: request.ip,
      path: request.path,
      method: request.method || "GET",
      user_agent: request.headers["user-agent"] || "",
      risk_score: 150,
      classification: "block",
      reasons: ["IP is blacklisted"],
      detector_details: { blacklist: 150 },
    }).catch(() => {});

    return result;
  }

  const detectorPromises: Array<Promise<DetectorResult> | DetectorResult> = [];

  if (cfg.enabledDetectors.rate) {
    detectorPromises.push(
      detectRate(request.ip, redis, cfg).catch((): DetectorResult => ({
        detector: "rate",
        score: 0,
        reason: null,
      }))
    );
  }

  if (cfg.enabledDetectors.userAgent) {
    detectorPromises.push(detectUserAgent(request.headers, cfg));
  }

  if (cfg.enabledDetectors.header) {
    detectorPromises.push(detectHeaders(request.headers, cfg));
  }

  if (cfg.enabledDetectors.ip) {
    detectorPromises.push(detectIp(request.ip, cfg));
  }

  if (cfg.enabledDetectors.fingerprint) {
    detectorPromises.push(detectFingerprint(request.headers, cfg));
  }

  if (cfg.enabledDetectors.payload) {
    detectorPromises.push(detectPayload(request.path, cfg, request.body));
  }

  if (cfg.enabledDetectors.behavior) {
    detectorPromises.push(
      detectBehavior(request.ip, request.path, redis, cfg).catch((): DetectorResult => ({
        detector: "behavior",
        score: 0,
        reason: null,
      }))
    );
  }

  if (cfg.enabledDetectors.reputation) {
    detectorPromises.push(
      runReputationDetector(request.ip, reputation, cfg).catch((): DetectorResult => ({
        detector: "reputation",
        score: 0,
        reason: null,
      }))
    );
  }

  const results = await Promise.all(detectorPromises);

  const { score, reasons, confidence, threat_breakdown } = calculateRiskScore(results);
  const classification = classifyRisk(score, cfg);
  const isBot = classification === "block";

  const detectorDetails: Record<string, number> = {};
  for (const r of results) {
    if (r.score > 0) {
      detectorDetails[r.detector] = r.score;
    }
  }

  await Promise.all([
    db.saveLog({
      ip: request.ip,
      path: request.path,
      method: request.method || "GET",
      user_agent: request.headers["user-agent"] || "",
      risk_score: score,
      classification,
      reasons,
      detector_details: detectorDetails,
    }).catch(() => {}),
    reputation.record(request.ip, score, cfg.thresholds.suspicious).catch(() => {}),
  ]);

  if (isBot) {
    const repScore = await reputation.getScore(request.ip).catch(() => 0);
    if (repScore >= cfg.reputation.autoBlacklistThreshold) {
      await db.addToBlacklist(
        request.ip,
        `Auto-blacklisted: reputation score ${repScore}`,
        cfg.blacklist.defaultDurationSeconds
      ).catch(() => {});
    }
  }

  return {
    bot: isBot,
    risk_score: score,
    classification,
    confidence,
    reasons,
    threat_breakdown,
  };
}
