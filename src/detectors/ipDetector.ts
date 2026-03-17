import { DetectorResult } from "../types/requestAnalysis";
import { HiluxConfig } from "../config/config";
import { buildCidrCache, isIpInCachedCidrs } from "../utils/cidr";

let cacheBuilt = false;

function ensureCache(cfg: HiluxConfig): void {
  if (!cacheBuilt) {
    buildCidrCache(cfg.datacenterCidrs);
    cacheBuilt = true;
  }
}

export function detectIp(ip: string, cfg: HiluxConfig): DetectorResult {
  ensureCache(cfg);

  if (cfg.torExitNodes.includes(ip)) {
    return {
      detector: "ip",
      score: cfg.scoring.torExitNode,
      reason: `IP is a known Tor exit node: ${ip}`,
    };
  }

  if (cfg.vpnProxyIps.includes(ip)) {
    return {
      detector: "ip",
      score: cfg.scoring.vpnProxy,
      reason: `IP is a known VPN/proxy: ${ip}`,
    };
  }

  if (isIpInCachedCidrs(ip)) {
    return {
      detector: "ip",
      score: cfg.scoring.datacenterIp,
      reason: `IP belongs to known datacenter CIDR: ${ip}`,
    };
  }

  return { detector: "ip", score: 0, reason: null };
}
