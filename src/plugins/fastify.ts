import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fp from "fastify-plugin";
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

  fastify.get(`${prefix}/health`, async (_req, reply) => {
    const health = await hilux.health();
    return reply.status(health.status === "ok" ? 200 : 503).send(health);
  });

  fastify.get(`${prefix}/stats`, async (_req, reply) => {
    return reply.send(await hilux.getStats());
  });

  fastify.get(`${prefix}/stats/top-offenders`, async (req, reply) => {
    const limit = parseInt((req.query as any)?.limit || "10", 10);
    return reply.send(await hilux.getTopOffenders(limit));
  });

  fastify.get(`${prefix}/stats/detectors`, async (_req, reply) => {
    return reply.send(await hilux.getDetectorBreakdown());
  });

  fastify.get(`${prefix}/stats/timeline`, async (req, reply) => {
    const interval = parseInt((req.query as any)?.interval || "60", 10);
    const buckets = parseInt((req.query as any)?.buckets || "24", 10);
    return reply.send(await hilux.getTimeSeries(interval, buckets));
  });

  fastify.get<{ Params: { ip: string } }>(
    `${prefix}/reputation/:ip`,
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
    async (req, reply) => {
      await hilux.resetReputation(req.params.ip);
      return reply.send({ success: true, ip: req.params.ip });
    }
  );

  fastify.get(`${prefix}/blacklist`, async (_req, reply) => {
    return reply.send(await hilux.getBlacklist());
  });

  fastify.post<{
    Body: { ip: string; reason?: string; duration_seconds?: number };
  }>(`${prefix}/blacklist`, async (req, reply) => {
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
    async (req, reply) => {
      const removed = await hilux.removeFromBlacklist(req.params.ip);
      if (!removed) {
        return reply.status(404).send({ error: "IP not found in blacklist" });
      }
      return reply.send({ success: true, ip: req.params.ip });
    }
  );

  fastify.addHook("onClose", async () => {
    await hilux.shutdown();
  });
}

export const hiluxFastifyPlugin = fp(hiluxPlugin, {
  name: "hilux",
  fastify: ">=4.0.0",
});
