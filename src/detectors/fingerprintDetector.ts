import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";

function checkAcceptHeader(headers: Record<string, string>): boolean {
  const accept = headers["accept"] || headers["Accept"] || "";
  return accept === "*/*" || accept === "";
}

function checkClientHints(headers: Record<string, string>): number {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  const ua = (lowerHeaders["user-agent"] || "").toLowerCase();
  if (!ua.includes("chrome/")) {
    return 0;
  }

  const match = ua.match(/chrome\/(\d+)/);
  if (!match || parseInt(match[1], 10) < 89) {
    return 0;
  }

  let missingCount = 0;
  const expectedHints = ["sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform"];
  for (const hint of expectedHints) {
    if (!lowerHeaders[hint]) {
      missingCount++;
    }
  }

  return missingCount;
}

function checkConnectionHeaders(headers: Record<string, string>): boolean {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  const encoding = lowerHeaders["accept-encoding"] || "";
  if (!encoding) {
    return true;
  }

  const hasBr = encoding.includes("br");
  const hasGzip = encoding.includes("gzip");
  if (!hasBr && !hasGzip) {
    return true;
  }

  return false;
}

export function detectFingerprint(
  headers: Record<string, string>,
  cfg: HiluxConfig
): DetectorResult {
  const anomalies: string[] = [];
  let score = 0;

  const genericAccept = checkAcceptHeader(headers);
  if (genericAccept) {
    anomalies.push("Generic or empty Accept header");
    score += 8;
  }

  const missingHints = checkClientHints(headers);
  if (missingHints >= 2) {
    anomalies.push(`Missing ${missingHints} Chrome client hints`);
    score += 10;
  }

  const suspiciousEncoding = checkConnectionHeaders(headers);
  if (suspiciousEncoding) {
    anomalies.push("Missing or unusual Accept-Encoding");
    score += 7;
  }

  if (score === 0) {
    return { detector: "fingerprint", score: 0, reason: null };
  }

  const finalScore = Math.min(score, cfg.scoring.fingerprintAnomaly);

  return {
    detector: "fingerprint",
    score: finalScore,
    reason: `Fingerprint anomalies: ${anomalies.join("; ")}`,
  };
}
