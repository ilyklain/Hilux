import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fp from "fastify-plugin";
import crypto from "crypto";
import path from "path";
import fastifyStatic from "@fastify/static";
import { Hilux } from "../hilux";
import { DeepPartial, HiluxConfig } from "../config/config";
import { AnalysisResult } from "../types/requestAnalysis";

declare module "fastify" {
  interface FastifyRequest {
    hilux?: AnalysisResult;
  }
  interface FastifyInstance {
    hilux: Hilux;
  }
}

async function hiluxPlugin(
  fastify: FastifyInstance,
  opts: DeepPartial<HiluxConfig>
): Promise<void> {
  const hilux = new Hilux(opts);
  await hilux.connect();

  fastify.decorate("hilux", hilux);

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = hilux.config.plugin.extractIp(request);
      const headers: Record<string, string> = {};
      const rawHeaders = request.headers;
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (typeof value === "string") {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value[0];
        }
      }

      const result = await hilux.analyze({
        ip,
        path: request.url,
        method: request.method,
        headers,
      });

      request.hilux = result;

      if (hilux.config.plugin.autoBlock && result.classification === "block") {
        return reply
          .status(hilux.config.plugin.blockStatusCode)
          .send({ error: hilux.config.plugin.blockMessage });
      }
    }
  );

  const prefix = hilux.config.plugin.prefix;

  // Single dynamic session token generated at startup
  const DASHBOARD_SESSION_TOKEN = crypto.randomBytes(32).toString("hex");

  fastify.get(`${prefix}/health`, async (_req, reply) => {
    const health = await hilux.health();
    return reply.status(health.status === "ok" ? 200 : 503).send(health);
  });

  fastify.post<{ Body: { password?: string } }>(`${prefix}/auth`, async (req, reply) => {
    const validPassword = process.env.HILUX_DASHBOARD_PASSWORD || "123456";

    if (req.body?.password === validPassword) {
      return reply.send({
        success: true,
        token: DASHBOARD_SESSION_TOKEN
      });
    }
    return reply.status(401).send({ error: "Invalid password" });
  });

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${DASHBOARD_SESSION_TOKEN}`) {
      return reply.status(401).send({ error: "Unauthorized access to Hilux metrics" });
    }
  };

  const protectedRoute = { preHandler: requireAuth };

  fastify.get(`${prefix}/stats`, protectedRoute, async (_req, reply) => {
    return reply.send(await hilux.getStats());
  });

  fastify.get(`${prefix}/stats/top-offenders`, protectedRoute, async (req, reply) => {
    const limit = parseInt((req.query as any)?.limit || "10", 10);
    return reply.send(await hilux.getTopOffenders(limit));
  });

  fastify.get(`${prefix}/stats/detectors`, protectedRoute, async (_req, reply) => {
    return reply.send(await hilux.getDetectorBreakdown());
  });

  fastify.get(`${prefix}/stats/timeline`, protectedRoute, async (req, reply) => {
    const interval = parseInt((req.query as any)?.interval || "60", 10);
    const buckets = parseInt((req.query as any)?.buckets || "24", 10);
    return reply.send(await hilux.getTimeSeries(interval, buckets));
  });

  fastify.post<{
    Body: { ip: string; path: string; method: string; headers: Record<string, string>; body?: string }
  }>(`${prefix}/stats/simulate`, protectedRoute, async (req, reply) => {
    const analysis = await hilux.analyze({
      ip: req.body.ip || "127.0.0.1",
      path: req.body.path || "/",
      method: req.body.method || "GET",
      headers: req.body.headers || {},
      body: req.body.body,
      simulate: true,
    });
    return reply.send(analysis);
  });

  fastify.get<{ Params: { ip: string } }>(
    `${prefix}/reputation/:ip`,
    protectedRoute,
    async (req, reply) => {
      const rep = await hilux.getReputation(req.params.ip);
      return reply.send(
        rep || {
          ip: req.params.ip,
          reputation_score: 0,
          total_requests: 0,
          total_violations: 0,
          last_seen: 0,
          auto_blacklisted: false,
        }
      );
    }
  );

  fastify.delete<{ Params: { ip: string } }>(
    `${prefix}/reputation/:ip`,
    protectedRoute,
    async (req, reply) => {
      await hilux.resetReputation(req.params.ip);
      return reply.send({ success: true, ip: req.params.ip });
    }
  );

  fastify.get(`${prefix}/blacklist`, protectedRoute, async (_req, reply) => {
    return reply.send(await hilux.getBlacklist());
  });

  fastify.get(`${prefix}/config`, protectedRoute, async (_req, reply) => {
    return reply.send(hilux.config);
  });

  fastify.post<{ Body: DeepPartial<HiluxConfig> }>(
    `${prefix}/config`,
    protectedRoute,
    async (req, reply) => {
      const merge = (target: any, source: any) => {
        for (const key of Object.keys(source)) {
          if (source[key] instanceof Object && !Array.isArray(source[key])) {
            Object.assign(source[key], merge(target[key], source[key]));
          }
        }
        Object.assign(target || {}, source);
        return target;
      };
      
      (hilux as any).config = merge(hilux.config, req.body);
      return reply.send({ success: true, updatedConfig: hilux.config });
    }
  );

  fastify.post<{
    Body: { ip: string; reason?: string; duration_seconds?: number };
  }>(`${prefix}/blacklist`, protectedRoute, async (req, reply) => {
    const { ip, reason, duration_seconds } = req.body;
    await hilux.addToBlacklist(
      ip,
      reason || "manual",
      duration_seconds || hilux.config.blacklist.defaultDurationSeconds
    );
    return reply.status(201).send({ success: true, ip });
  });

  fastify.delete<{ Params: { ip: string } }>(
    `${prefix}/blacklist/:ip`,
    protectedRoute,
    async (req, reply) => {
      const removed = await hilux.removeFromBlacklist(req.params.ip);
      if (!removed) {
        return reply.status(404).send({ error: "IP not found in blacklist" });
      }
      return reply.send({ success: true, ip: req.params.ip });
    }
  );

  fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../dashboard-ui/out"),
    prefix: `${prefix}-dashboard/`,
    decorateReply: true,
  });

  const dashboardPages = ['settings', 'rules', 'logs', 'blacklist', 'login'];

  fastify.get(`${prefix}-dashboard`, async (_req, reply) => {
    return reply.redirect(`${prefix}-dashboard/`);
  });

  for (const page of dashboardPages) {
    fastify.get(`${prefix}-dashboard/${page}`, async (_req, reply) => {
      return reply.sendFile(`${page}.html`);
    });
    fastify.get(`${prefix}-dashboard/${page}/`, async (_req, reply) => {
      return reply.sendFile(`${page}.html`);
    });
  }

  fastify.addHook("onClose", async () => {
    await hilux.shutdown();
  });
}

export const hiluxFastifyPlugin = fp(hiluxPlugin, {
  name: "hilux",
  fastify: ">=4.0.0",
});
