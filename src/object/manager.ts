import { Hilux } from "../hilux";
import { HiluxRequestAdapter } from "./requestsobject";
import { AnalysisResult, AnalysisRequest } from "../types/requestAnalysis";
import { BlacklistController } from "../controller/blacklist";
import { WhitelistController } from "../controller/whitelist";

export class HiluxManager {
    private static instance: HiluxManager | null = null;
    public hilux: Hilux;
    public blacklist: BlacklistController;
    public whitelist: WhitelistController;

    constructor(config?: any) {
        this.hilux = new Hilux(config);
        this.blacklist = new BlacklistController(this.hilux);
        this.whitelist = new WhitelistController(this.hilux);
    }


    static getInstance(config?: any): HiluxManager {
        if (!this.instance) {
            this.instance = new HiluxManager(config);
        }
        return this.instance;
    }

    async initialize() {
        if (!this.hilux.isConnected()) {
            await this.hilux.connect();
        }
    }

    async analyze(rawRequest: any, framework: 'express' | 'fastify'): Promise<AnalysisResult> {
        await this.initialize();
        const normalized: AnalysisRequest = framework === 'express'
            ? HiluxRequestAdapter.fromExpress(rawRequest)
            : HiluxRequestAdapter.fromFastify(rawRequest);

        const isWhitelisted = await this.whitelist.check(normalized.ip);
        if (isWhitelisted) {
            return {
                bot: false,
                risk_score: 0,
                classification: "allow",
                confidence: 1,
                reasons: ["IP in whitelist"],
                threat_breakdown: []
            };
        }

        const isBlacklisted = await this.blacklist.check(normalized.ip);
        if (isBlacklisted) {
            return {
                bot: true,
                risk_score: 100,
                classification: "block",
                confidence: 1,
                reasons: ["IP in blacklist"],
                threat_breakdown: []
            };
        }

        return await this.hilux.analyze(normalized);
    }
}
