export { Hilux } from "./hilux";
export { HiluxManager } from "./object/manager";
export { HiluxRequestAdapter } from "./object/requestsobject";
export { BlacklistController } from "./controller/blacklist";
export { WhitelistController } from "./controller/whitelist";

export {
  HiluxConfig,
  DeepPartial,
  HiluxServerConfig,
  HiluxRedisConfig,
  HiluxPostgresConfig,
  HiluxRateLimitConfig,
  HiluxScoringConfig,
  HiluxThresholdsConfig,
  HiluxReputationConfig,
  HiluxBlacklistConfig,
  HiluxDetectorsToggle,
  HiluxBehaviorConfig,
  HiluxPluginConfig,
  buildConfig,
  buildConfigFromEnv,
} from "./config/config";

export {
  Classification,
  DetectorName,
  AnalysisRequest,
  AnalysisResult,
  DetectorResult,
  ThreatBreakdown,
  DetectionLog,
  DetectionStats,
  TopOffender,
  DetectorBreakdown,
  TimeSeriesBucket,
  DetailedStats,
  IpReputationInfo,
  BlacklistEntry,
  BehaviorProfile,
  HealthStatus,
} from "./types/requestAnalysis";

export { hiluxFastifyPlugin } from "./plugins/fastify";
export { hiluxExpressMiddleware } from "./plugins/express";
export { HiluxModule, HiluxGuard, createHiluxMiddleware as hiluxNestMiddleware } from "./plugins/nestjs";
export { hiluxKoaMiddleware } from "./plugins/koa";

export { RedisManager } from "./utils/redis";
export { DatabaseManager } from "./utils/database";
export { ReputationManager } from "./utils/ipReputation";

export { detectRate } from "./detectors/rateDetector";
export { detectUserAgent } from "./detectors/userAgentDetector";
export { detectHeaders } from "./detectors/headerDetector";
export { detectIp } from "./detectors/ipDetector";
export { detectFingerprint } from "./detectors/fingerprintDetector";
export { detectPayload } from "./detectors/payloadDetector";
export { detectBehavior } from "./detectors/behaviorDetector";

export { dispatchWebhook } from "./extensions/webhookAlerts";
export { getChallengeHtml, verifyTurnstileToken, verifyHCaptchaToken, verifyPowSolution } from "./extensions/challengeGateway";
export { calculateDelay, applyTarpit } from "./extensions/tarpit";
export { CircuitBreaker } from "./extensions/circuitBreaker";
export { verifyIntegrityToken, generateClientSDK, getIntegrityScriptTag } from "./extensions/clientIntegrity";
export { detectEnumeration } from "./detectors/enumerationDetector";
