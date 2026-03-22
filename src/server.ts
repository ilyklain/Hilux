#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import crypto from "crypto";
import path from "path";
import fastifyStatic from "@fastify/static";
import { Hilux } from "./hilux";
import { buildConfigFromEnv } from "./config/config";
import { AnalysisRequest } from "./types/requestAnalysis";

const cfg = buildConfigFromEnv();
const hilux = new Hilux(cfg);

const server = Fastify({ logger: true });

const DASHBOARD_SESSION_TOKEN = crypto.randomBytes(32).toString("hex");

const analyzeSchema = {
  body: {
    type: "object" as const,
    required: ["ip", "path", "headers"],
    properties: {
      ip: { type: "string" as const, minLength: 1 },
      path: { type: "string" as const, minLength: 1 },
      method: { type: "string" as const },
      headers: { type: "object" as const },
      body: { type: "string" as const },
    },
  },
};

const blacklistAddSchema = {
  body: {
    type: "object" as const,
    required: ["ip"],
    properties: {
      ip: { type: "string" as const, minLength: 1 },
      reason: { type: "string" as const },
      duration_seconds: { type: "number" as const },
    },
  },
};

server.setErrorHandler((error: Error, _request, reply) => {
  server.log.error(error);
  reply.status(500).send({
    error: "Internal Server Error",
    message: error.message,
  });
});

server.addHook("onRequest", (request, _reply, done) => {
  (request as any).startTime = Date.now();
  done();
});

server.addHook("onResponse", (request, reply, done) => {
  const duration = Date.now() - ((request as any).startTime || Date.now());
  server.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration_ms: duration,
  });
  done();
});

server.post<{ Body: AnalysisRequest }>(
  "/analyze",
  { schema: analyzeSchema },
  async (request, reply) => {
    const result = await hilux.analyze(request.body);
    return reply.send(result);
  }
);

server.get("/health", async (_request, reply) => {
  const health = await hilux.health();
  const statusCode = health.status === "ok" ? 200 : 503;
  return reply.status(statusCode).send(health);
});

server.get("/stats", async (_request, reply) => {
  return reply.send(await hilux.getStats());
});

server.get("/stats/top-offenders", async (request, reply) => {
  const limit = parseInt((request.query as any)?.limit || "10", 10);
  return reply.send(await hilux.getTopOffenders(limit));
});

server.get("/stats/detectors", async (_request, reply) => {
  return reply.send(await hilux.getDetectorBreakdown());
});

server.get("/stats/timeline", async (request, reply) => {
  const interval = parseInt((request.query as any)?.interval || "60", 10);
  const buckets = parseInt((request.query as any)?.buckets || "24", 10);
  return reply.send(await hilux.getTimeSeries(interval, buckets));
});

server.get<{ Params: { ip: string } }>(
  "/reputation/:ip",
  async (request, reply) => {
    const rep = await hilux.getReputation(request.params.ip);
    return reply.send(
      rep || {
        ip: request.params.ip,
        reputation_score: 0,
        total_requests: 0,
        total_violations: 0,
        last_seen: 0,
        auto_blacklisted: false,
      }
    );
  }
);

server.delete<{ Params: { ip: string } }>(
  "/reputation/:ip",
  async (request, reply) => {
    await hilux.resetReputation(request.params.ip);
    return reply.send({ success: true, ip: request.params.ip });
  }
);

server.get("/blacklist", async (_request, reply) => {
  return reply.send(await hilux.getBlacklist());
});

server.get("/config", async (_request, reply) => {
  return reply.send(hilux.config);
});

server.post<{ Body: import("./config/config").DeepPartial<import("./config/config").HiluxConfig> }>(
  "/config",
  async (request, reply) => {
    const merge = (target: any, source: any) => {
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
          Object.assign(source[key], merge(target[key], source[key]));
        }
      }
      Object.assign(target || {}, source);
      return target;
    };

    (hilux as any).config = merge(hilux.config, request.body);

    if (hilux.config.plugin.webhookUrl && hilux.config.plugin.webhookEvents?.onSystem) {
      fetch(hilux.config.plugin.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Hilux - WAF configuration has been dynamically updated via the dashboard API."
        })
      }).catch(err => server.log.error("Webhook dispatch failed", err));
    }

    return reply.send({ success: true, updatedConfig: hilux.config });
  }
);

server.post<{
  Body: { ip: string; reason?: string; duration_seconds?: number };
}>(
  "/blacklist",
  { schema: blacklistAddSchema },
  async (request, reply) => {
    const { ip, reason, duration_seconds } = request.body;
    await hilux.addToBlacklist(
      ip,
      reason || "manual",
      duration_seconds || cfg.blacklist.defaultDurationSeconds
    );
    return reply.status(201).send({ success: true, ip });
  }
);

server.delete<{ Params: { ip: string } }>(
  "/blacklist/:ip",
  async (request, reply) => {
    const removed = await hilux.removeFromBlacklist(request.params.ip);
    if (!removed) {
      return reply.status(404).send({ error: "IP not found in blacklist" });
    }
    return reply.send({ success: true, ip: request.params.ip });
  }
);
server.post<{ Body: { password?: string } }>("/hilux/auth", async (req, reply) => {
  const validPassword = process.env.HILUX_DASHBOARD_PASSWORD || "123456";
  if (req.body?.password === validPassword) {
    return reply.send({ success: true, token: DASHBOARD_SESSION_TOKEN });
  }
  return reply.status(401).send({ error: "Invalid password" });
});

server.register(fastifyStatic, {
  root: path.join(__dirname, "../dashboard-ui/out"),
  prefix: "/hilux-dashboard/",
  decorateReply: true,
});

server.get("/hilux-dashboard", async (_req, reply) => {
  return reply.redirect("/hilux-dashboard/");
});

const dashboardPages = ['settings', 'rules', 'logs', 'blacklist', 'login'];
for (const page of dashboardPages) {
  server.get(`/hilux-dashboard/${page}`, async (_req, reply) => {
    return reply.sendFile(`${page}.html`);
  });
  server.get(`/hilux-dashboard/${page}/`, async (_req, reply) => {
    return reply.sendFile(`${page}.html`);
  });
}

async function start(): Promise<void> {
  try {
    await hilux.connect();
    server.log.info("Hilux initialized");

    await server.listen({
      port: cfg.server.port,
      host: cfg.server.host,
    });

    server.log.info(
      `Hilux bot detector running on ${cfg.server.host}:${cfg.server.port}`
    );

    if (cfg.plugin.webhookUrl && cfg.plugin.webhookEvents?.onSystem) {
      fetch(cfg.plugin.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Hilux - Server initialized and bot detector running on ${cfg.server.host}:${cfg.server.port}`
        })
      }).catch(err => server.log.error("Webhook dispatch failed", err));
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  server.log.info("Shutting down...");
  await server.close();
  await hilux.shutdown();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
