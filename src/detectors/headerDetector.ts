import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";

function countMissingHeaders(headers: Record<string, string>, cfg: HiluxConfig): string[] {
  const lowerHeaders = Object.keys(headers).map((h) => h.toLowerCase());
  return cfg.requiredBrowserHeaders.filter(
    (required) => !lowerHeaders.includes(required)
  );
}

function checkChromeConsistency(headers: Record<string, string>, cfg: HiluxConfig): string | null {
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  if (!userAgent.includes("chrome/")) {
    return null;
  }

  const lowerHeaders = Object.keys(headers).map((h) => h.toLowerCase());
  const missingChromeHeaders = cfg.chromeConsistencyHeaders.filter(
    (h) => !lowerHeaders.includes(h)
  );

  if (missingChromeHeaders.length > 0) {
    return `Chrome UA but missing: ${missingChromeHeaders.join(", ")}`;
  }
  return null;
}

function checkImpossibleCombinations(headers: Record<string, string>): string | null {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  const ua = (lowerHeaders["user-agent"] || "").toLowerCase();
  const acceptLang = lowerHeaders["accept-language"] || "";

  if (ua.includes("chrome/") && ua.includes("firefox/")) {
    return "Impossible User-Agent: claims both Chrome and Firefox";
  }

  if (ua.includes("mozilla/") && !acceptLang && !ua.includes("bot") && !ua.includes("crawler")) {
    return "Browser-like UA but missing Accept-Language";
  }

  const secFetchSite = lowerHeaders["sec-fetch-site"];
  const secFetchMode = lowerHeaders["sec-fetch-mode"];
  if (secFetchSite === "same-origin" && secFetchMode === "navigate" && !lowerHeaders["referer"]) {
    return "Inconsistent: sec-fetch-site=same-origin without Referer";
  }

  return null;
}

export function detectHeaders(
  headers: Record<string, string>,
  cfg: HiluxConfig
): DetectorResult {
  const missing = countMissingHeaders(headers, cfg);
  const inconsistency = checkChromeConsistency(headers, cfg);
  const impossible = checkImpossibleCombinations(headers);

  if (impossible) {
    return {
      detector: "header",
      score: cfg.scoring.missingHeaders + cfg.scoring.headerInconsistency,
      reason: impossible,
    };
  }

  const reasons: string[] = [];
  let score = 0;

  if (missing.length >= 3) {
    score += cfg.scoring.missingHeaders;
    reasons.push(`Missing ${missing.length} browser headers: ${missing.join(", ")}`);
  } else if (missing.length > 0) {
    score += Math.round(cfg.scoring.missingHeaders * (missing.length / cfg.requiredBrowserHeaders.length));
    reasons.push(`Missing headers: ${missing.join(", ")}`);
  }

  if (inconsistency) {
    score += cfg.scoring.headerInconsistency;
    reasons.push(inconsistency);
  }

  if (reasons.length === 0) {
    return { detector: "header", score: 0, reason: null };
  }

  return {
    detector: "header",
    score,
    reason: reasons.join("; "),
  };
}
