import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";

function checkSqlInjection(input: string, cfg: HiluxConfig): string | null {
  const lower = input.toLowerCase();
  for (const pattern of cfg.sqlInjectionPatterns) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(lower)) {
      return `SQL injection pattern detected: ${pattern}`;
    }
  }
  return null;
}

function checkPathTraversal(path: string, cfg: HiluxConfig): string | null {
  const decoded = decodeURIComponent(path);
  for (const pattern of cfg.pathTraversalPatterns) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(decoded) || regex.test(path)) {
      return `Path traversal attempt: ${pattern}`;
    }
  }
  return null;
}

function checkScannerPath(path: string, cfg: HiluxConfig): string | null {
  const lowerPath = path.toLowerCase().split("?")[0];
  for (const scannerPath of cfg.scannerPaths) {
    if (lowerPath === scannerPath.toLowerCase() || lowerPath.startsWith(scannerPath.toLowerCase() + "/")) {
      return `Known scanner path: ${scannerPath}`;
    }
  }
  return null;
}

export function detectPayload(
  path: string,
  cfg: HiluxConfig,
  body?: string
): DetectorResult {
  const threats: string[] = [];

  const scannerResult = checkScannerPath(path, cfg);
  if (scannerResult) {
    threats.push(scannerResult);
  }

  const traversalResult = checkPathTraversal(path, cfg);
  if (traversalResult) {
    threats.push(traversalResult);
  }

  const pathQuerySqli = checkSqlInjection(path, cfg);
  if (pathQuerySqli) {
    threats.push(pathQuerySqli);
  }

  if (body) {
    const bodySqli = checkSqlInjection(body, cfg);
    if (bodySqli) {
      threats.push(`Body: ${bodySqli}`);
    }
  }

  if (threats.length === 0) {
    return { detector: "payload", score: 0, reason: null };
  }

  return {
    detector: "payload",
    score: cfg.scoring.payloadThreat,
    reason: `Payload threats: ${threats.join("; ")}`,
  };
}
