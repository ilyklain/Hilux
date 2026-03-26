import { Hilux } from "../hilux";
import { DeepPartial, HiluxConfig } from "../config/config";
import { AnalysisResult } from "../types/requestAnalysis";
import { IncomingMessage, ServerResponse } from "http";
import { applyTarpit } from "../extensions/tarpit";
import { getChallengeHtml } from "../extensions/challengeGateway";

export interface HiluxExpressRequest extends IncomingMessage {
  hilux?: AnalysisResult;
  ip?: string;
  url?: string;
  method?: string;
  body?: any;
}

export type NextFunction = (err?: any) => void;

export interface HiluxExpressOptions extends DeepPartial<HiluxConfig> {
  autoBlock?: boolean;
  blockStatusCode?: number;
  blockMessage?: string;
}

export function hiluxExpressMiddleware(
  opts?: HiluxExpressOptions
): (req: HiluxExpressRequest, res: ServerResponse, next: NextFunction) => void {
  const hilux = new Hilux(opts);
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  const autoBlock = opts?.autoBlock ?? true;
  const blockStatusCode = opts?.blockStatusCode ?? 403;
  const blockMessage = opts?.blockMessage ?? '{"error":"Forbidden"}';

  async function ensureConnected(): Promise<void> {
    if (initialized) {
      return;
    }
    if (!initPromise) {
      initPromise = hilux.connect().then(() => {
        initialized = true;
      });
    }
    await initPromise;
  }

  const middleware = (
    req: HiluxExpressRequest,
    res: ServerResponse,
    next: NextFunction
  ): void => {
    ensureConnected()
      .then(async () => {
        const ip = hilux.config.plugin.extractIp(req);
        const headers: Record<string, string> = {};
        if (req.headers) {
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value[0];
            }
          }
        }

        const result = await hilux.analyze({
          ip,
          path: req.url || "/",
          method: req.method || "GET",
          headers,
          body: typeof req.body === "string" ? req.body : undefined,
        });

        req.hilux = result;

        if (result.tarpit_delay_ms && result.tarpit_delay_ms > 0) {
          await applyTarpit(result.tarpit_delay_ms);
        }

        if (result.challenge_required) {
          const challengeHtml = getChallengeHtml(
            hilux.config.plugin.challenge as any,
            `${hilux.config.plugin.prefix}/challenge/verify`
          );
          res.writeHead(429, { "Content-Type": "text/html" });
          res.end(challengeHtml);
          return;
        }

        if (autoBlock && result.classification === "block") {
          res.writeHead(blockStatusCode, { "Content-Type": "application/json" });
          res.end(blockMessage);
          return;
        }

        next();
      })
      .catch(next);
  };

  (middleware as any).hilux = hilux;

  return middleware;
}
