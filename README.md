# Hilux

Powerful bot detector for APIs. Analyzes HTTP requests with 8-signal detection, IP reputation tracking, and cumulative risk scoring.

## Features

- **8 Detection Signals** — Rate limiting, User-Agent analysis, header consistency, IP/CIDR matching, fingerprinting, payload inspection, behavior analysis, IP reputation
- **Graduated Scoring** — Risk scores from 0–150 with allow/suspicious/block classification
- **IP Reputation** — Redis-backed tracking with auto-escalation and decay
- **Blacklist Management** — Manual and automatic blacklisting with expiration
- **Graceful Degradation** — Continues working with partial analysis if Redis goes down
- **Framework Integrations** — Fastify plugin, Express middleware, or standalone API

## Install

```bash
npm install hilux
```

## Quick Start

### Programmatic API

```typescript
import { Hilux } from "hilux";

const hilux = new Hilux({
  redis: { host: "127.0.0.1", port: 6379 },
  postgres: { host: "127.0.0.1", port: 5432, user: "postgres", password: "postgres", database: "hilux" },
});

await hilux.connect();

const result = await hilux.analyze({
  ip: "203.0.113.50",
  path: "/api/data",
  method: "GET",
  headers: {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "accept-language": "en-US,en;q=0.9",
  },
});

console.log(result);
// {
//   bot: false,
//   risk_score: 0,
//   classification: "allow",
//   confidence: 0,
//   reasons: [],
//   threat_breakdown: []
// }

await hilux.shutdown();
```

### Fastify Plugin

```typescript
import Fastify from "fastify";
import { hiluxFastifyPlugin } from "hilux";

const app = Fastify();

await app.register(hiluxFastifyPlugin, {
  redis: { host: "127.0.0.1" },
  postgres: { host: "127.0.0.1", user: "postgres", password: "postgres", database: "hilux" },
  plugin: {
    autoBlock: true,
    prefix: "/hilux",
  },
});

app.get("/", async (request, reply) => {
  // request.hilux contains the analysis result
  return { message: "Hello", botScore: request.hilux?.risk_score };
});

await app.listen({ port: 3000 });
```

### Express Middleware

```typescript
import express from "express";
import { hiluxExpressMiddleware } from "hilux";

const app = express();

app.use(hiluxExpressMiddleware({
  redis: { host: "127.0.0.1" },
  postgres: { host: "127.0.0.1", user: "postgres", password: "postgres", database: "hilux" },
  autoBlock: true,
}));

app.get("/", (req, res) => {
  res.json({ message: "Hello", botScore: req.hilux?.risk_score });
});

app.listen(3000);
```

### Standalone Server

```bash
npx hilux-server
```

Or configure via `.env`:

```env
PORT=3000
REDIS_HOST=127.0.0.1
POSTGRES_HOST=127.0.0.1
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hilux
```

## API Endpoints (Standalone / Fastify)

| Method | Path | Description |
|--------|------|-------------|
| POST | /analyze | Analyze a request |
| GET | /health | Service health status |
| GET | /stats | Detection counts |
| GET | /stats/top-offenders | Top offending IPs |
| GET | /stats/detectors | Per-detector breakdown |
| GET | /stats/timeline | Time-series stats |
| GET | /reputation/:ip | Query IP reputation |
| DELETE | /reputation/:ip | Reset IP reputation |
| GET | /blacklist | List blacklisted IPs |
| POST | /blacklist | Add IP to blacklist |
| DELETE | /blacklist/:ip | Remove from blacklist |

## Detectors

| Detector | Signals | Score |
|----------|---------|-------|
| Rate | Mild / Heavy / Burst | +20 / +40 / +50 |
| User-Agent | Known bot / Spoofed / Truncated | +30 / +25 / +15 |
| Header | Missing / Inconsistent / Impossible | +5–35 |
| IP | Datacenter / Tor / VPN | +30 / +30 / +20 |
| Fingerprint | Accept / Encoding / Client hints | up to +25 |
| Payload | SQLi / Traversal / Scanner | +35 |
| Behavior | Path diversity / Regular timing | up to +25 |
| Reputation | Low / Bad / Critical | +15 / +25 / +40 |

## Configuration

All defaults can be overridden via the constructor:

```typescript
const hilux = new Hilux({
  thresholds: { suspicious: 30, block: 60 },
  scoring: { rateLimitBurst: 60 },
  enabledDetectors: { payload: false },
  whitelistedIps: ["127.0.0.1"],
});
```

## Requirements

- Node.js >= 18
- Redis
- PostgreSQL

## License

MIT
