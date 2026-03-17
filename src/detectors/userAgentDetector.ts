import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";

const CHROME_UA_REGEX = /Chrome\/(\d+)\.\d+\.\d+\.\d+/;
const FIREFOX_UA_REGEX = /Firefox\/(\d+)\.\d+/;

function isSpoofedChrome(userAgent: string, cfg: HiluxConfig): boolean {
  const match = userAgent.match(CHROME_UA_REGEX);
  if (!match) {
    return false;
  }
  const majorVersion = parseInt(match[1], 10);
  return (
    majorVersion < cfg.invalidChromeVersions.minMajor ||
    majorVersion > cfg.invalidChromeVersions.maxMajor
  );
}

function isSpoofedFirefox(userAgent: string): boolean {
  const match = userAgent.match(FIREFOX_UA_REGEX);
  if (!match) {
    return false;
  }
  const majorVersion = parseInt(match[1], 10);
  return majorVersion < 50 || majorVersion > 200;
}

function isTruncatedUA(userAgent: string): boolean {
  return userAgent.length > 0 && userAgent.length < 20;
}

export function detectUserAgent(
  headers: Record<string, string>,
  cfg: HiluxConfig
): DetectorResult {
  const userAgent = headers["user-agent"] || "";

  if (!userAgent) {
    return {
      detector: "user-agent",
      score: cfg.scoring.suspiciousUserAgent,
      reason: "Missing User-Agent header",
    };
  }

  if (isTruncatedUA(userAgent)) {
    return {
      detector: "user-agent",
      score: cfg.scoring.suspiciousUaPattern,
      reason: `Truncated User-Agent: "${userAgent}"`,
    };
  }

  const lowerUA = userAgent.toLowerCase();

  for (const pattern of cfg.suspiciousUserAgents) {
    if (lowerUA.includes(pattern.toLowerCase())) {
      return {
        detector: "user-agent",
        score: cfg.scoring.suspiciousUserAgent,
        reason: `Known bot User-Agent detected: ${pattern}`,
      };
    }
  }

  if (isSpoofedChrome(userAgent, cfg)) {
    return {
      detector: "user-agent",
      score: cfg.scoring.spoofedUserAgent,
      reason: `Spoofed Chrome version detected: ${userAgent.match(CHROME_UA_REGEX)?.[0]}`,
    };
  }

  if (isSpoofedFirefox(userAgent)) {
    return {
      detector: "user-agent",
      score: cfg.scoring.spoofedUserAgent,
      reason: `Spoofed Firefox version detected: ${userAgent.match(FIREFOX_UA_REGEX)?.[0]}`,
    };
  }

  return { detector: "user-agent", score: 0, reason: null };
}
