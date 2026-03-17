import { DetectorResult, ThreatBreakdown } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";

export function calculateRiskScore(results: DetectorResult[]): {
  score: number;
  reasons: string[];
  confidence: number;
  threat_breakdown: ThreatBreakdown[];
} {
  let score = 0;
  const reasons: string[] = [];
  const threat_breakdown: ThreatBreakdown[] = [];
  let detectorsTriggered = 0;
  const totalDetectors = results.length;

  for (const result of results) {
    score += result.score;
    if (result.reason) {
      detectorsTriggered++;
      reasons.push(result.reason);
      threat_breakdown.push({
        detector: result.detector,
        score: result.score,
        reason: result.reason,
      });
    }
  }

  const clampedScore = Math.min(score, 150);
  const confidence =
    totalDetectors > 0
      ? Math.round((detectorsTriggered / totalDetectors) * 100)
      : 0;

  return {
    score: clampedScore,
    reasons,
    confidence,
    threat_breakdown,
  };
}

export function classifyRisk(
  score: number,
  cfg: HiluxConfig
): "allow" | "suspicious" | "block" {
  if (score > cfg.thresholds.block) {
    return "block";
  }
  if (score >= cfg.thresholds.suspicious) {
    return "suspicious";
  }
  return "allow";
}
