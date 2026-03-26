export interface HiluxServerConfig {
  port: number;
  host: string;
}

export interface HiluxRedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
}

export interface HiluxPostgresConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface HiluxRateLimitConfig {
  window: number;
  max: number;
  burstWindow: number;
  burstMax: number;
}

export interface HiluxScoringConfig {
  rateLimitMild: number;
  rateLimitHigh: number;
  rateLimitBurst: number;
  suspiciousUserAgent: number;
  spoofedUserAgent: number;
  suspiciousUaPattern: number;
  missingHeaders: number;
  headerInconsistency: number;
  datacenterIp: number;
  torExitNode: number;
  vpnProxy: number;
  fingerprintAnomaly: number;
  payloadThreat: number;
  behaviorAnomaly: number;
  reputationLow: number;
  reputationBad: number;
  reputationCritical: number;
}

export interface HiluxThresholdsConfig {
  suspicious: number;
  block: number;
}

export interface HiluxReputationConfig {
  decayIntervalSeconds: number;
  decayAmount: number;
  escalationStep: number;
  autoBlacklistThreshold: number;
  ttlSeconds: number;
}

export interface HiluxBlacklistConfig {
  defaultDurationSeconds: number;
}

export interface HiluxDetectorsToggle {
  rate: boolean;
  userAgent: boolean;
  header: boolean;
  ip: boolean;
  fingerprint: boolean;
  payload: boolean;
  behavior: boolean;
  reputation: boolean;
}

export interface HiluxBehaviorConfig {
  windowSeconds: number;
  maxPaths: number;
  regularIntervalThresholdMs: number;
  minRequestsForAnalysis: number;
}

export interface HiluxPluginConfig {
  autoBlock: boolean;
  blockStatusCode: number;
  blockMessage: string;
  extractIp: (req: any) => string;
  prefix: string;
  webhookUrl?: string;
  webhookUrls: string[];
  webhookEvents: {
    onBan: boolean;
    onBlock: boolean;
    onSuspicious: boolean;
    onChallenge: boolean;
    onSystem: boolean;
  };
  challenge: {
    enabled: boolean;
    provider: "turnstile" | "hcaptcha" | "pow";
    siteKey?: string;
    secretKey?: string;
    powDifficulty: number;
    sessionTtlSeconds: number;
    bypassCookieName: string;
  };
  tarpit: {
    enabled: boolean;
    baseDelayMs: number;
    maxDelayMs: number;
    scoreThreshold: number;
  };
}

export interface HiluxCustomRule {
  id: string;
  condition: string;
  operator: string;
  value: string;
  action: "ALLOW" | "BLOCK" | "LOG" | "CHALLENGE" | "SIMULATE";
}

export interface HiluxLoginProtectorConfig {
  enabled: boolean;
  paths: string[];
  maxAttempts: number;
  windowSeconds: number;
  honeypotField: string;
}

export interface HiluxGeoBlockingConfig {
  enabled: boolean;
  blockedCountries: string[];
}

export interface HiluxHoneypotDecoysConfig {
  enabled: boolean;
  paths: string[];
  banDurationSeconds: number;
}

export interface HiluxVirtualPatchingConfig {
  enabled: boolean;
  activePatches: string[];
}

export interface HiluxExtensionsConfig {
  loginProtector: HiluxLoginProtectorConfig;
  geoBlocking: HiluxGeoBlockingConfig;
  honeypotDecoys: HiluxHoneypotDecoysConfig;
  virtualPatching: HiluxVirtualPatchingConfig;
}

export interface HiluxConfig {
  server: HiluxServerConfig;
  redis: HiluxRedisConfig;
  postgres: HiluxPostgresConfig;
  rateLimit: HiluxRateLimitConfig;
  scoring: HiluxScoringConfig;
  thresholds: HiluxThresholdsConfig;
  reputation: HiluxReputationConfig;
  blacklist: HiluxBlacklistConfig;
  enabledDetectors: HiluxDetectorsToggle;
  plugin: HiluxPluginConfig;
  whitelistedIps: string[];
  customRules: HiluxCustomRule[];
  extensions: HiluxExtensionsConfig;
  suspiciousUserAgents: string[];
  invalidChromeVersions: { minMajor: number; maxMajor: number };
  requiredBrowserHeaders: string[];
  chromeConsistencyHeaders: string[];
  datacenterCidrs: string[];
  torExitNodes: string[];
  vpnProxyIps: string[];
  scannerPaths: string[];
  sqlInjectionPatterns: string[];
  pathTraversalPatterns: string[];
  behavior: HiluxBehaviorConfig;
  plan: "Free" | "Pro" | "Enterprise";
  licenseKey?: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function defaultExtractIp(req: any): string {
  return (
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers?.["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

const DEFAULT_CONFIG: HiluxConfig = {
  server: {
    port: 3000,
    host: "0.0.0.0",
  },

  redis: {
    enabled: true,
    host: "127.0.0.1",
    port: 6379,
    password: undefined,
  },

  postgres: {
    enabled: true,
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "hilux",
  },

  rateLimit: {
    window: 60,
    max: 100,
    burstWindow: 5,
    burstMax: 20,
  },

  scoring: {
    rateLimitMild: 20,
    rateLimitHigh: 40,
    rateLimitBurst: 50,
    suspiciousUserAgent: 30,
    spoofedUserAgent: 25,
    suspiciousUaPattern: 15,
    missingHeaders: 20,
    headerInconsistency: 15,
    datacenterIp: 30,
    torExitNode: 30,
    vpnProxy: 20,
    fingerprintAnomaly: 25,
    payloadThreat: 35,
    behaviorAnomaly: 25,
    reputationLow: 15,
    reputationBad: 25,
    reputationCritical: 40,
  },

  thresholds: {
    suspicious: 40,
    block: 70,
  },

  reputation: {
    decayIntervalSeconds: 3600,
    decayAmount: 5,
    escalationStep: 10,
    autoBlacklistThreshold: 200,
    ttlSeconds: 86400,
  },

  blacklist: {
    defaultDurationSeconds: 3600,
  },

  enabledDetectors: {
    rate: true,
    userAgent: true,
    header: true,
    ip: true,
    fingerprint: true,
    payload: true,
    behavior: true,
    reputation: true,
  },

  plugin: {
    autoBlock: true,
    blockStatusCode: 403,
    blockMessage: "Forbidden",
    extractIp: defaultExtractIp,
    prefix: "/hilux",
    webhookUrl: undefined,
    webhookUrls: [],
    webhookEvents: {
      onBan: true,
      onBlock: false,
      onSuspicious: false,
      onChallenge: false,
      onSystem: true,
    },
    challenge: {
      enabled: false,
      provider: "pow",
      powDifficulty: 4,
      sessionTtlSeconds: 3600,
      bypassCookieName: "hilux_verified",
    },
    tarpit: {
      enabled: false,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      scoreThreshold: 20,
    },
  },

  whitelistedIps: [],
  customRules: [],

  extensions: {
    loginProtector: {
      enabled: false,
      paths: ["/login", "/auth/login", "/wp-login.php"],
      maxAttempts: 5,
      windowSeconds: 300,
      honeypotField: "hilux_hidden_field",
    },
    geoBlocking: {
      enabled: false,
      blockedCountries: [],
    },
    honeypotDecoys: {
      enabled: false,
      paths: ["/.env", "/phpmyadmin", "/wp-login.php", "/.git/config"],
      banDurationSeconds: 86400,
    },
    virtualPatching: {
      enabled: false,
      activePatches: ["log4shell", "springshell", "shellshock"],
    },
  },

  plan: "Free",
  licenseKey: "",

  suspiciousUserAgents: [
    "curl",
    "python-requests",
    "python-urllib",
    "node-fetch",
    "go-http-client",
    "wget",
    "httpclient",
    "java/",
    "libwww-perl",
    "mechanize",
    "scrapy",
    "phantom",
    "selenium",
    "headless",
    "puppeteer",
    "playwright",
    "axios/",
    "okhttp",
    "apache-httpclient",
    "http_request",
    "postmanruntime",
  ],

  invalidChromeVersions: {
    minMajor: 60,
    maxMajor: 200,
  },

  requiredBrowserHeaders: [
    "accept-language",
    "sec-fetch-site",
    "sec-fetch-mode",
    "sec-fetch-dest",
  ],

  chromeConsistencyHeaders: [
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
  ],

  datacenterCidrs: [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "34.64.0.0/10",
    "34.128.0.0/10",
    "35.184.0.0/13",
    "35.192.0.0/12",
    "35.208.0.0/12",
    "35.224.0.0/12",
    "35.240.0.0/13",
    "104.196.0.0/14",
    "104.154.0.0/15",
    "13.52.0.0/14",
    "13.56.0.0/14",
    "18.144.0.0/15",
    "18.204.0.0/14",
    "3.101.0.0/16",
    "52.8.0.0/13",
    "54.148.0.0/13",
    "54.176.0.0/12",
    "54.192.0.0/12",
    "54.208.0.0/13",
    "54.216.0.0/14",
    "54.220.0.0/15",
    "54.224.0.0/12",
    "54.240.0.0/12",
    "20.33.0.0/16",
    "20.40.0.0/13",
    "20.48.0.0/12",
    "20.64.0.0/10",
    "20.128.0.0/16",
    "40.74.0.0/15",
    "40.76.0.0/14",
    "40.80.0.0/12",
    "40.96.0.0/12",
    "40.112.0.0/13",
    "40.120.0.0/14",
    "40.124.0.0/16",
    "40.125.0.0/17",
    "52.96.0.0/12",
    "52.112.0.0/14",
    "52.120.0.0/14",
    "104.40.0.0/13",
    "104.208.0.0/13",
    "137.116.0.0/15",
    "137.135.0.0/16",
    "138.91.0.0/16",
    "157.55.0.0/16",
    "157.56.0.0/14",
    "168.61.0.0/16",
    "168.62.0.0/15",
    "191.232.0.0/13",
    "159.203.0.0/16",
    "167.99.0.0/16",
    "167.172.0.0/16",
    "137.184.0.0/16",
    "143.198.0.0/16",
    "161.35.0.0/16",
    "164.90.0.0/16",
    "165.22.0.0/16",
    "134.209.0.0/16",
    "139.59.0.0/16",
    "142.93.0.0/16",
    "144.126.0.0/16",
    "178.62.0.0/15",
    "188.166.0.0/15",
    "206.189.0.0/16",
    "209.97.0.0/16",
    "51.68.0.0/16",
    "51.75.0.0/16",
    "51.77.0.0/16",
    "51.79.0.0/16",
    "51.81.0.0/16",
    "51.83.0.0/16",
    "51.89.0.0/16",
    "51.91.0.0/16",
    "51.161.0.0/16",
    "51.178.0.0/16",
    "51.195.0.0/16",
    "51.210.0.0/16",
    "51.254.0.0/15",
    "54.36.0.0/14",
    "91.134.0.0/15",
    "92.222.0.0/16",
    "141.94.0.0/15",
    "141.95.0.0/16",
    "145.239.0.0/16",
    "146.59.0.0/16",
    "147.135.0.0/16",
    "149.202.0.0/15",
    "151.80.0.0/16",
    "164.132.0.0/16",
    "176.31.0.0/16",
    "178.32.0.0/15",
    "185.12.32.0/22",
    "198.27.64.0/18",
    "198.100.144.0/20",
    "192.99.0.0/16",
    "193.70.0.0/16",
    "213.32.0.0/17",
    "213.186.32.0/19",
  ],

  torExitNodes: [],
  vpnProxyIps: [],

  scannerPaths: [
    "/wp-admin",
    "/wp-login.php",
    "/wp-content",
    "/wp-includes",
    "/xmlrpc.php",
    "/phpmyadmin",
    "/phpMyAdmin",
    "/pma",
    "/adminer",
    "/.env",
    "/.git",
    "/.git/config",
    "/.svn",
    "/.htaccess",
    "/.htpasswd",
    "/config.php",
    "/config.yml",
    "/web.config",
    "/server-status",
    "/server-info",
    "/actuator",
    "/actuator/health",
    "/actuator/env",
    "/api/swagger",
    "/swagger-ui",
    "/swagger.json",
    "/graphql",
    "/graphiql",
    "/debug",
    "/trace",
    "/console",
    "/druid",
    "/solr",
    "/admin",
    "/administrator",
    "/manager/html",
    "/jmx-console",
    "/web-console",
    "/shell",
    "/cgi-bin",
    "/test",
    "/backup",
    "/dump",
    "/db",
  ],

  sqlInjectionPatterns: [
    "union\\s+select",
    "or\\s+1\\s*=\\s*1",
    "and\\s+1\\s*=\\s*1",
    "drop\\s+table",
    "insert\\s+into",
    "delete\\s+from",
    "update\\s+.*\\s+set",
    "exec\\s*\\(",
    "execute\\s*\\(",
    "xp_cmdshell",
    "information_schema",
    "sysobjects",
    "syscolumns",
    "waitfor\\s+delay",
    "benchmark\\s*\\(",
    "sleep\\s*\\(",
    "load_file\\s*\\(",
    "into\\s+outfile",
    "into\\s+dumpfile",
    "char\\s*\\(\\s*\\d+",
    "concat\\s*\\(",
    "group_concat\\s*\\(",
    "hex\\s*\\(",
    "unhex\\s*\\(",
    "--\\s*$",
    "/\\*.*\\*/",
    "';",
    "' or '",
    "\" or \"",
    "1'\\s*or\\s*'1",
  ],

  pathTraversalPatterns: [
    "\\.\\./",
    "\\.\\.",
    "%2e%2e",
    "%252e%252e",
    "\\.\\.%2f",
    "%2e%2e/",
    "%2e%2e%5c",
    "\\.\\.\\\\",
  ],

  behavior: {
    windowSeconds: 300,
    maxPaths: 50,
    regularIntervalThresholdMs: 50,
    minRequestsForAnalysis: 5,
  },
};

function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    if (sourceVal === undefined) {
      continue;
    }
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, any>,
        sourceVal as Record<string, any>
      ) as T[keyof T];
    } else {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

export function buildConfig(overrides?: DeepPartial<HiluxConfig>): HiluxConfig {
  if (!overrides) {
    return { ...DEFAULT_CONFIG };
  }
  return deepMerge(DEFAULT_CONFIG, overrides);
}

export function buildConfigFromEnv(): HiluxConfig {
  const envOverrides: DeepPartial<HiluxConfig> = {
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      host: process.env.HOST || undefined,
    },
    redis: {
      enabled: process.env.REDIS_ENABLED !== "false",
      host: process.env.REDIS_HOST || undefined,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD || undefined,
    },
    postgres: {
      enabled: process.env.POSTGRES_ENABLED !== "false",
      host: process.env.POSTGRES_HOST || undefined,
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : undefined,
      user: process.env.POSTGRES_USER || undefined,
      password: process.env.POSTGRES_PASSWORD || undefined,
      database: process.env.POSTGRES_DB || undefined,
    },
    rateLimit: {
      window: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW, 10) : undefined,
      max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : undefined,
      burstWindow: process.env.RATE_LIMIT_BURST_WINDOW ? parseInt(process.env.RATE_LIMIT_BURST_WINDOW, 10) : undefined,
      burstMax: process.env.RATE_LIMIT_BURST_MAX ? parseInt(process.env.RATE_LIMIT_BURST_MAX, 10) : undefined,
    },
    reputation: {
      decayIntervalSeconds: process.env.REPUTATION_DECAY_INTERVAL ? parseInt(process.env.REPUTATION_DECAY_INTERVAL, 10) : undefined,
      decayAmount: process.env.REPUTATION_DECAY_AMOUNT ? parseInt(process.env.REPUTATION_DECAY_AMOUNT, 10) : undefined,
      escalationStep: process.env.REPUTATION_ESCALATION_STEP ? parseInt(process.env.REPUTATION_ESCALATION_STEP, 10) : undefined,
      autoBlacklistThreshold: process.env.REPUTATION_AUTO_BLACKLIST ? parseInt(process.env.REPUTATION_AUTO_BLACKLIST, 10) : undefined,
      ttlSeconds: process.env.REPUTATION_TTL ? parseInt(process.env.REPUTATION_TTL, 10) : undefined,
    },
    blacklist: {
      defaultDurationSeconds: process.env.BLACKLIST_DURATION ? parseInt(process.env.BLACKLIST_DURATION, 10) : undefined,
    },
    plugin: {
      webhookUrl: process.env.HILUX_WEBHOOK_URL || undefined,
      webhookEvents: {
        onBan: process.env.WEBHOOK_ON_BAN !== "false",
        onBlock: process.env.WEBHOOK_ON_BLOCK === "true",
        onSuspicious: process.env.WEBHOOK_ON_SUSPICIOUS === "true",
        onSystem: process.env.WEBHOOK_ON_SYSTEM !== "false",
      }
    },
    behavior: {
      windowSeconds: process.env.BEHAVIOR_WINDOW ? parseInt(process.env.BEHAVIOR_WINDOW, 10) : undefined,
      maxPaths: process.env.BEHAVIOR_MAX_PATHS ? parseInt(process.env.BEHAVIOR_MAX_PATHS, 10) : undefined,
      regularIntervalThresholdMs: process.env.BEHAVIOR_INTERVAL_THRESHOLD ? parseInt(process.env.BEHAVIOR_INTERVAL_THRESHOLD, 10) : undefined,
      minRequestsForAnalysis: process.env.BEHAVIOR_MIN_REQUESTS ? parseInt(process.env.BEHAVIOR_MIN_REQUESTS, 10) : undefined,
    },
    enabledDetectors: {
      rate: process.env.DETECTOR_RATE !== "false",
      userAgent: process.env.DETECTOR_USER_AGENT !== "false",
      header: process.env.DETECTOR_HEADER !== "false",
      ip: process.env.DETECTOR_IP !== "false",
      fingerprint: process.env.DETECTOR_FINGERPRINT !== "false",
      payload: process.env.DETECTOR_PAYLOAD !== "false",
      behavior: process.env.DETECTOR_BEHAVIOR !== "false",
      reputation: process.env.DETECTOR_REPUTATION !== "false",
    },
    whitelistedIps: process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(",").filter(Boolean) : undefined,
    torExitNodes: process.env.TOR_EXIT_NODES ? process.env.TOR_EXIT_NODES.split(",").filter(Boolean) : undefined,
    vpnProxyIps: process.env.VPN_PROXY_IPS ? process.env.VPN_PROXY_IPS.split(",").filter(Boolean) : undefined,
  };

  return buildConfig(envOverrides);
}
