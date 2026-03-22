# Hilux: Bot Detection and API Hardening

Hilux is a high-performance, multilayered bot detection and deception engine designed for modern API infrastructures. It provides real-time analysis of incoming HTTP requests, utilizing an 8-signal heuristic engine to identify, score, and mitigate automated threats before they reach your application logic.

Designed for scalability and resilience, Hilux offers sub-millisecond latency for request analysis and integrates seamlessly with Fastify, Express, or as a standalone security gateway.

## Core Capabilities

### Multi-Signal Heuristic Engine
Hilux analyzes traffic through eight distinct security signals to generate a cumulative risk score:
- **Rate & Burst Analysis**: Tracks request velocity and identifies burst patterns characteristic of automated scripts.
- **User-Agent Forensics**: Detects known bot signatures, spoofed identities, and truncated headers.
- **Header Fingerprinting**: Identifies inconsistencies between browser headers and declared client types.
- **IP Intelligence**: Cross-references traffic against known datacenter ranges, Tor exit nodes, and VPN proxies.
- **Payload Inspection**: Scans for SQL injection patterns, path traversal, and common scanning tool signatures.
- **Behavioral Profiling**: Monitors path diversity and request timing to identify non-human interaction patterns.
- **Fingerprint Persistence**: Maintains client fingerprints to track sophisticated bots that rotate IP addresses.
- **Global Reputation**: Leverages historical violation data to assign long-term risk profiles to specific network actors.

### Hardened Management Dashboard
Hilux includes a full-featured, secure dashboard for low-latency monitoring and real-time configuration:
- **Live Traffic Stream**: Monitor security events as they occur with detailed threat breakdowns.
- **Advanced Deception**: Deploy "Honeypot Decoys" to mislead attackers and accelerate their blacklisting.
- **Virtual Patching**: Enable logic-level fixes for known CVEs without modifying your core application code.
- **Geographic Fencing**: Block or challenge traffic based on geographic origin.
- **Credential Protection**: Hardened login protectors to mitigate credential stuffing and account takeover (ATO) attacks.

## Installation

```bash
npm install @gustavoj/hilux
```

## Implementation

### Standalone Security Gateway
For environments requiring a decoupled security layer, Hilux can run as a standalone server:

```bash
# Start the Hilux standalone server
npx hilux-server
```

Configuration is managed via environment variables:
```env
PORT=3000
HOST=0.0.0.0

REDIS_ENABLED=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

POSTGRES_ENABLED=false
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hilux

RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=100
RATE_LIMIT_BURST_WINDOW=5
RATE_LIMIT_BURST_MAX=20

REPUTATION_DECAY_INTERVAL=3600
REPUTATION_DECAY_AMOUNT=5
REPUTATION_ESCALATION_STEP=10
REPUTATION_AUTO_BLACKLIST=200
REPUTATION_TTL=86400

BLACKLIST_DURATION=3600

BEHAVIOR_WINDOW=300
BEHAVIOR_MAX_PATHS=50
BEHAVIOR_INTERVAL_THRESHOLD=50
BEHAVIOR_MIN_REQUESTS=5

DETECTOR_RATE=true
DETECTOR_USER_AGENT=true
DETECTOR_HEADER=true
DETECTOR_IP=true
DETECTOR_FINGERPRINT=true
DETECTOR_PAYLOAD=true
DETECTOR_BEHAVIOR=true
DETECTOR_REPUTATION=true

WHITELISTED_IPS=
TOR_EXIT_NODES=
VPN_PROXY_IPS=


HILUX_DASHBOARD_PASSWORD="admin"
```

### Framework Integration

#### Fastify
```typescript
import Fastify from "fastify";
import { hiluxFastifyPlugin } from "@gustavoj/hilux";

const app = Fastify();

await app.register(hiluxFastifyPlugin, {
  plugin: {
    autoBlock: true,
    prefix: "/hilux-api"
  }
});
```

#### Express
```typescript
import express from "express";
import { hiluxExpressMiddleware } from "@gustavoj/hilux";

const app = express();

app.use(hiluxExpressMiddleware({
  autoBlock: true
}));
```

## Security Tiers and Licensing

Hilux implements a tiered security model to cater to different infrastructure needs:
- **Community**: Core heuristics and basic monitoring for non-commercial use.
- **Pro**: Advanced modules including Login Protector, Geo-Blocking, and Honeypot Decoys.
- **Enterprise**: Full forensic data streams, Virtual Patching for CVEs, and priority architecture support.

Licensing is managed via the integrated billing module, supporting secure activation through Lemon Squeezy license keys.

## Architecture

Hilux is built on a high-availability architecture:
- **Engine**: TypeScript core with extensible detector modules.
- **Persistence**: PostgreSQL for long-term forensic logs and configuration storage.
- **Cache Layer**: Redis for sub-millisecond reputation tracking and rate-limit counters.
- **Interoperability**: Standardized JSON API for integration with SOC and SIEM platforms.

## Developer Resources

- **Main Repository**: [github.com/ilyklain/Hilux](https://github.com/ilyklain/Hilux)
- **NPM Package**: [@gustavoj/hilux](https://www.npmjs.com/package/@gustavoj/hilux)
- **Documentation**: [hilux.dev](https://hilux-website.vercel.app/docs)

## License

Copyright (c) 2026 Hilux Security. Licensed under the MIT License.
