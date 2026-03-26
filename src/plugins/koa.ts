import { Hilux } from "../hilux";
import { DeepPartial, HiluxConfig } from "../config/config";
import { AnalysisResult } from "../types/requestAnalysis";

/**
 * Hilux Koa Integration
 *
 * Usage:
 *   import Koa from "koa";
 *   import { hiluxKoaMiddleware } from "@gustavoj/hilux/koa";
 *
 *   const app = new Koa();
 *   app.use(hiluxKoaMiddleware({ autoBlock: true }));
 *
 *   app.use((ctx) => {
 *     const analysis = ctx.state.hilux;
 *     ctx.body = { risk: analysis.risk_score };
 *   });
 */

export interface HiluxKoaOptions extends DeepPartial<HiluxConfig> {
  autoBlock?: boolean;
  blockStatusCode?: number;
  blockMessage?: string;
  excludeRoutes?: string[];
}

export function hiluxKoaMiddleware(opts?: HiluxKoaOptions) {
  const hilux = new Hilux(opts);
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  const autoBlock = opts?.autoBlock ?? true;
  const blockStatusCode = opts?.blockStatusCode ?? 403;
  const blockMessage = opts?.blockMessage ?? '{"error":"Forbidden"}';
  const excludeRoutes = opts?.excludeRoutes || [];

  async function ensureConnected(): Promise<void> {
    if (initialized) return;
    if (!initPromise) {
      initPromise = hilux.connect().then(() => {
        initialized = true;
      });
    }
    await initPromise;
  }

  const middleware = async (ctx: any, next: () => Promise<void>) => {
    await ensureConnected();

    const url = ctx.url || ctx.path || "/";

    if (excludeRoutes.some((route: string) => url.startsWith(route))) {
      return next();
    }

    const ip = hilux.config.plugin.extractIp(ctx.req);
    const headers: Record<string, string> = {};

    if (ctx.headers) {
      for (const [key, value] of Object.entries(ctx.headers)) {
        if (typeof value === "string") {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = (value as string[])[0];
        }
      }
    }

    const result: AnalysisResult = await hilux.analyze({
      ip,
      path: url,
      method: ctx.method || "GET",
      headers,
      body: typeof ctx.request?.body === "string" ? ctx.request.body : undefined,
    });

    ctx.state.hilux = result;

    if (autoBlock && result.classification === "block") {
      ctx.status = blockStatusCode;
      ctx.body = JSON.parse(blockMessage);
      return;
    }

    await next();
  };

  (middleware as any).hilux = hilux;

  return middleware;
}

export { AnalysisResult } from "../types/requestAnalysis";
export { Hilux } from "../hilux";
