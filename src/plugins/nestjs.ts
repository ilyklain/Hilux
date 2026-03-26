import { Hilux } from "../hilux";
import { DeepPartial, HiluxConfig } from "../config/config";
import { AnalysisResult } from "../types/requestAnalysis";

/**
 * Hilux NestJS Integration
 *
 * Provides a DynamicModule, an Injectable Guard, and a decorator
 * for seamless integration with NestJS applications.
 *
 * Usage:
 *   // app.module.ts
 *   import { HiluxModule } from "@gustavoj/hilux/nestjs";
 *
 *   @Module({
 *     imports: [
 *       HiluxModule.register({ autoBlock: true }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 *   // In a controller:
 *   import { HiluxResult } from "@gustavoj/hilux/nestjs";
 *
 *   @Get("/secure")
 *   getData(@HiluxResult() analysis: AnalysisResult) {
 *     return { risk: analysis.risk_score };
 *   }
 */

export const HILUX_INSTANCE = "HILUX_INSTANCE";
export const HILUX_OPTIONS = "HILUX_OPTIONS";

export interface HiluxNestOptions extends DeepPartial<HiluxConfig> {
  autoBlock?: boolean;
  blockStatusCode?: number;
  blockMessage?: string;
  excludeRoutes?: string[];
}

/**
 * HiluxGuard intercepts every request, runs the Hilux analysis,
 * attaches the result to `request.hilux`, and optionally blocks
 * high-risk traffic before it reaches your controller.
 *
 * This class is designed to be framework-agnostic within NestJS:
 * it works with both Express and Fastify adapters.
 */
export class HiluxGuard {
  private hilux: Hilux;
  private options: HiluxNestOptions;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(hilux: Hilux, options: HiluxNestOptions) {
    this.hilux = hilux;
    this.options = options;
  }

  private async ensureConnected(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.hilux.connect().then(() => {
        this.initialized = true;
      });
    }
    await this.initPromise;
  }

  async canActivate(context: any): Promise<boolean> {
    await this.ensureConnected();

    const request = context.switchToHttp().getRequest();
    const url = request.url || request.raw?.url || "/";

    const excluded = this.options.excludeRoutes || [];
    if (excluded.some((route: string) => url.startsWith(route))) {
      return true;
    }

    const ip = this.hilux.config.plugin.extractIp(request.raw || request);
    const headers: Record<string, string> = {};
    const rawHeaders = request.headers || (request.raw?.headers) || {};

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value === "string") {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = (value as string[])[0];
      }
    }

    const result: AnalysisResult = await this.hilux.analyze({
      ip,
      path: url,
      method: request.method || "GET",
      headers,
      body: typeof request.body === "string" ? request.body : undefined,
    });

    request.hilux = result;

    const autoBlock = this.options.autoBlock ?? true;
    if (autoBlock && result.classification === "block") {
      const response = context.switchToHttp().getResponse();
      const statusCode = this.options.blockStatusCode ?? 403;
      const message = this.options.blockMessage ?? '{"error":"Forbidden"}';

      if (typeof response.status === "function") {
        // Express adapter
        response.status(statusCode).json(JSON.parse(message));
      } else if (typeof response.code === "function") {
        // Fastify adapter
        response.code(statusCode).send(JSON.parse(message));
      }

      return false;
    }

    return true;
  }
}

/**
 * Creates a NestJS-compatible middleware function.
 * Use this if you prefer `app.use()` over Guards.
 *
 * Usage:
 *   const app = await NestFactory.create(AppModule);
 *   app.use(createHiluxMiddleware({ autoBlock: true }));
 */
export function createHiluxMiddleware(opts?: HiluxNestOptions) {
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

  return async function hiluxMiddleware(req: any, res: any, next: (err?: any) => void) {
    try {
      await ensureConnected();

      const url = req.url || req.originalUrl || "/";

      if (excludeRoutes.some((route: string) => url.startsWith(route))) {
        return next();
      }

      const ip = hilux.config.plugin.extractIp(req);
      const headers: Record<string, string> = {};

      if (req.headers) {
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === "string") {
            headers[key] = value;
          } else if (Array.isArray(value)) {
            headers[key] = (value as string[])[0];
          }
        }
      }

      const result = await hilux.analyze({
        ip,
        path: url,
        method: req.method || "GET",
        headers,
        body: typeof req.body === "string" ? req.body : undefined,
      });

      req.hilux = result;

      if (autoBlock && result.classification === "block") {
        res.writeHead(blockStatusCode, { "Content-Type": "application/json" });
        res.end(blockMessage);
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * HiluxModule provides a static `register()` method that returns
 * a NestJS DynamicModule-compatible object.
 *
 * Since we can't import NestJS decorators as a dependency,
 * this returns a plain object that NestJS can consume.
 */
export class HiluxModule {
  static register(options?: HiluxNestOptions) {
    const hilux = new Hilux(options);
    const guard = new HiluxGuard(hilux, options || {});

    return {
      module: HiluxModule,
      providers: [
        { provide: HILUX_INSTANCE, useValue: hilux },
        { provide: HILUX_OPTIONS, useValue: options || {} },
        { provide: HiluxGuard, useValue: guard },
      ],
      exports: [HILUX_INSTANCE, HILUX_OPTIONS, HiluxGuard],
      global: true,
    };
  }
}

export { AnalysisResult } from "../types/requestAnalysis";
export { Hilux } from "../hilux";
