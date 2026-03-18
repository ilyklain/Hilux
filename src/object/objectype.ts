import { Hilux } from "../hilux";
import { HiluxConfig, DeepPartial } from "../config/config";

export { Hilux };

export {
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
} from "../config/config";

export { HiluxConfig, DeepPartial };

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
} from "../types/requestAnalysis";

export { hiluxFastifyPlugin } from "../plugins/fastify";
export { hiluxExpressMiddleware, HiluxExpressRequest, HiluxExpressOptions, NextFunction } from "../plugins/express";

export { RedisManager } from "../utils/redis";
export { DatabaseManager } from "../utils/database";
export { ReputationManager } from "../utils/ipReputation";

export { detectRate } from "../detectors/rateDetector";
export { detectUserAgent } from "../detectors/userAgentDetector";
export { detectHeaders } from "../detectors/headerDetector";
export { detectIp } from "../detectors/ipDetector";
export { detectFingerprint } from "../detectors/fingerprintDetector";
export { detectPayload } from "../detectors/payloadDetector";
export { detectBehavior } from "../detectors/behaviorDetector";

export class HiluxManager {
    private static instance: Hilux | null = null;

    static async getInstance(config?: DeepPartial<HiluxConfig>): Promise<Hilux> {
        if (!this.instance) {
            this.instance = new Hilux(config);
            await this.instance.connect();
        }
        return this.instance;
    }

    static async getDatabase() {
        const hilux = await this.getInstance();
        return hilux.db;
    }

    static async shutdown() {
        if (this.instance) {
            await this.instance.shutdown();
            this.instance = null;
        }
    }
}

