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
import { dispatchWebhook, WebhookPayload } from "../extensions/webhookAlerts";
import { calculateDelay } from "../extensions/tarpit";
import { verifyIntegrityToken } from "../extensions/clientIntegrity";
import { detectEnumeration } from "../detectors/enumerationDetector";
import geoip from "geoip-lite";

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

  if (cfg.customRules && cfg.customRules.length > 0) {
    for (const rule of cfg.customRules) {
      let subject = "";
      if (rule.condition === "Request.IP") subject = request.ip;
      if (rule.condition === "Request.Path") subject = request.path;
      if (rule.condition === "Request.Method") subject = request.method || "GET";
      if (rule.condition === "Request.Country") {
        const geo = geoip.lookup(request.ip);
        subject = geo?.country || "";
      }
      if (rule.condition.startsWith("Headers.")) {
        const headerName = rule.condition.split(".")[1].toLowerCase();
        subject = request.headers[headerName] || "";
      }

      let matched = false;
      const lowerSubject = subject.toLowerCase();
      const lowerValue = rule.value.toLowerCase();

      switch (rule.operator) {
        case "equals": matched = lowerSubject === lowerValue; break;
        case "not_equals": matched = lowerSubject !== lowerValue; break;
        case "contains": matched = lowerSubject.includes(lowerValue); break;
        case "not_contains": matched = !lowerSubject.includes(lowerValue); break;
        case "starts_with": matched = lowerSubject.startsWith(lowerValue); break;
        case "ends_with": matched = lowerSubject.endsWith(lowerValue); break;
        case "regex": try { matched = new RegExp(rule.value, "i").test(subject); } catch { matched = false; } break;
        case "is_empty": matched = subject.trim() === ""; break;
        case "is_not_empty": matched = subject.trim() !== ""; break;
      }

      if (matched) {
        if (rule.action === "BLOCK") {
          const result: AnalysisResult = {
            bot: true,
            risk_score: 100,
            classification: "block",
            confidence: 100,
            reasons: [`Custom Rule Triggered: ${rule.id} (${rule.condition})`],
            threat_breakdown: [{ detector: "reputation", score: 100, reason: "Custom Block Rule" }],
          };
          if (!request.simulate) {
            await db.saveLog({
              ip: request.ip,
              path: request.path,
              method: request.method || "GET",
              user_agent: request.headers["user-agent"] || "",
              risk_score: 100,
              classification: "block",
              reasons: result.reasons,
              detector_details: { customRule: 100 },
            }).catch(() => { });
          }
          return result;
        } else if (rule.action === "ALLOW") {
          return {
            bot: false,
            risk_score: 0,
            classification: "allow",
            confidence: 100,
            reasons: [`Custom Rule Triggered (Allow): ${rule.id}`],
            threat_breakdown: [],
          };
        }
      }
    }
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

    if (!request.simulate) {
      await db.saveLog({
        ip: request.ip,
        path: request.path,
        method: request.method || "GET",
        user_agent: request.headers["user-agent"] || "",
        risk_score: 150,
        classification: "block",
        reasons: ["IP is blacklisted"],
        detector_details: { blacklist: 150 },
      }).catch(() => { });
    }

    return result;
  }

  const isPro = cfg.plan === "Pro" || cfg.plan === "Enterprise";
  const isEnt = cfg.plan === "Enterprise";

  if (cfg.extensions?.loginProtector?.enabled && isPro) {
    const loginCfg = cfg.extensions.loginProtector;
    const isLoginPath = loginCfg.paths.some(p => request.path.startsWith(p));

    if (isLoginPath) {
      if (loginCfg.honeypotField && request.body) {
        try {
          const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
          if (body[loginCfg.honeypotField]) {
            const result: AnalysisResult = {
              bot: true,
              risk_score: 100,
              classification: "block",
              confidence: 100,
              reasons: ["Login Honeypot Triggered"],
              threat_breakdown: [{ detector: "behavior", score: 100, reason: "Honeypot filled" }],
            };
            if (!request.simulate) {
              await db.saveLog({
                ip: request.ip,
                path: request.path,
                method: request.method || "GET",
                user_agent: request.headers["user-agent"] || "",
                risk_score: 100,
                classification: "block",
                reasons: result.reasons,
                detector_details: { extension: 100 },
              }).catch(() => { });
              await db.addToBlacklist(request.ip, "Honeypot triggered", 86400).catch(() => { });
            }
            return result;
          }
        } catch { }
      }

      if (loginCfg.maxAttempts > 0) {
        const key = `hilux:login_bf:${request.ip}:${request.path}`;
        const attempts = (await redis.get(key).catch(() => "0")) || "0";
        const currentCount = parseInt(attempts, 10) + 1;

        if (currentCount > loginCfg.maxAttempts) {
          const result: AnalysisResult = {
            bot: true,
            risk_score: 100,
            classification: "block",
            confidence: 100,
            reasons: ["Login Brute-Force Detected"],
            threat_breakdown: [{ detector: "rate", score: 100, reason: "Too many login attempts" }],
          };
          if (!request.simulate) {
            await db.saveLog({
              ip: request.ip,
              path: request.path,
              method: request.method || "GET",
              user_agent: request.headers["user-agent"] || "",
              risk_score: 100,
              classification: "block",
              reasons: result.reasons,
              detector_details: { extension: 100 },
            }).catch(() => { });
          }
          return result;
        }

        if (!request.simulate) {
          await redis.set(key, currentCount.toString(), loginCfg.windowSeconds).catch(() => { });
        }
      }
    }
  }

  if (cfg.extensions?.geoBlocking?.enabled && cfg.extensions.geoBlocking.blockedCountries.length > 0 && isPro) {
    const geo = geoip.lookup(request.ip);
    if (geo && cfg.extensions.geoBlocking.blockedCountries.includes(geo.country)) {
      const result: AnalysisResult = {
        bot: true,
        risk_score: 100,
        classification: "block",
        confidence: 100,
        reasons: [`Geo-Blocking: ${geo.country} is restricted`],
        threat_breakdown: [{ detector: "ip", score: 100, reason: "Country blocked" }],
      };
      if (!request.simulate) {
        await db.saveLog({
          ip: request.ip,
          path: request.path,
          method: request.method || "GET",
          user_agent: request.headers["user-agent"] || "",
          risk_score: 100,
          classification: "block",
          reasons: result.reasons,
          detector_details: { extension: 100 },
        }).catch(() => { });
      }
      return result;
    }
  }

  if (cfg.extensions?.honeypotDecoys?.enabled && isPro) {
    const hpCfg = cfg.extensions.honeypotDecoys;
    if (hpCfg.paths.some(p => request.path === p)) {
      const result: AnalysisResult = {
        bot: true,
        risk_score: 100,
        classification: "block",
        confidence: 100,
        reasons: ["Honeypot Decoy Triggered"],
        threat_breakdown: [{ detector: "behavior", score: 100, reason: "Hit trap endpoint" }],
      };
      if (!request.simulate) {
        await db.saveLog({
          ip: request.ip,
          path: request.path,
          method: request.method || "GET",
          user_agent: request.headers["user-agent"] || "",
          risk_score: 100,
          classification: "block",
          reasons: result.reasons,
          detector_details: { extension: 100 },
        }).catch(() => { });
        await db.addToBlacklist(request.ip, "Honeypot Decoy hit", hpCfg.banDurationSeconds).catch(() => { });
      }
      return result;
    }
  }

  if (cfg.extensions?.virtualPatching?.enabled && isEnt) {
    const vpCfg = cfg.extensions.virtualPatching;
    const bodyStr = request.body ? (typeof request.body === "string" ? request.body : JSON.stringify(request.body)) : "";
    const subject = (request.path + " " + bodyStr).toLowerCase();

    const patchPatterns: Record<string, RegExp> = {
      log4shell: /\$\{jndi:(ldap|rmi|dns|nis|iiop|corba|lds|http):/i,
      springshell: /class\.module\.classLoader/i,
      shellshock: /\(\)\s*\{\s*[:;]\s*\}\s*/i,
    };

    for (const patchName of vpCfg.activePatches) {
      const pattern = patchPatterns[patchName];
      if (pattern && pattern.test(subject)) {
        const result: AnalysisResult = {
          bot: true,
          risk_score: 100,
          classification: "block",
          confidence: 100,
          reasons: [`Virtual Patch Triggered: ${patchName}`],
          threat_breakdown: [{ detector: "payload", score: 100, reason: "Exploit pattern matched" }],
        };
        if (!request.simulate) {
          await db.saveLog({
            ip: request.ip,
            path: request.path,
            method: request.method || "GET",
            user_agent: request.headers["user-agent"] || "",
            risk_score: 100,
            classification: "block",
            reasons: result.reasons,
            detector_details: { extension: 100 },
          }).catch(() => { });
        }
        return result;
      }
    }
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

  if (cfg.behavior.enumerationDetection) {
    detectorPromises.push(
      detectEnumeration(request.ip, request.path, redis, cfg).catch((): DetectorResult => ({
        detector: "behavior",
        score: 0,
        reason: null,
      }))
    );
  }

  const integrityResult = verifyIntegrityToken(
    request.headers[cfg.plugin.clientIntegrity?.headerName || "x-hilux-integrity"],
    cfg.plugin.clientIntegrity as any
  );
  if (integrityResult.score > 0) {
    detectorPromises.push(Promise.resolve({
      detector: "fingerprint" as const,
      score: integrityResult.score,
      reason: integrityResult.reason,
    }));
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

  if (!request.simulate) {
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
      }).catch(() => { }),
      reputation.record(request.ip, score, cfg.thresholds.suspicious).catch(() => { }),
    ]);

    const webhookUrls = [
      ...(cfg.plugin.webhookUrl ? [cfg.plugin.webhookUrl] : []),
      ...(cfg.plugin.webhookUrls || []),
    ];

    if (isBot) {
      const repScore = await reputation.getScore(request.ip).catch(() => 0);
      if (repScore >= cfg.reputation.autoBlacklistThreshold) {
        await db.addToBlacklist(
          request.ip,
          `Auto-blacklisted: reputation score ${repScore}`,
          cfg.blacklist.defaultDurationSeconds
        ).catch(() => { });
      }

      if (webhookUrls.length > 0 && cfg.plugin.webhookEvents?.onBlock) {
        dispatchWebhook({
          event: "block",
          ip: request.ip,
          path: request.path,
          score,
          reasons,
          classification,
          timestamp: new Date().toISOString(),
        }, { urls: webhookUrls }).catch(() => { });
      }
    } else if (classification === "suspicious" && webhookUrls.length > 0 && cfg.plugin.webhookEvents?.onSuspicious) {
      dispatchWebhook({
        event: "suspicious",
        ip: request.ip,
        path: request.path,
        score,
        reasons,
        classification,
        timestamp: new Date().toISOString(),
      }, { urls: webhookUrls }).catch(() => { });
    }
  }

  const tarpitDelay = calculateDelay(score, cfg.thresholds.block, cfg.plugin.tarpit as any);

  const isShadow = cfg.plugin.shadowMode === true;
  const finalClassification = isShadow ? (classification === "block" ? "suspicious" : classification) : classification;
  const finalIsBot = isShadow ? false : isBot;

  return {
    bot: finalIsBot,
    risk_score: score,
    classification: finalClassification,
    confidence,
    reasons: isShadow ? [...reasons, "[Shadow Mode: would have been " + classification + "]"] : reasons,
    threat_breakdown,
    tarpit_delay_ms: tarpitDelay,
    challenge_required: classification === "suspicious" && cfg.plugin.challenge?.enabled,
  };
}
