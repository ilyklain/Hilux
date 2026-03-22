import { Pool } from "pg";
import { HiluxPostgresConfig, HiluxConfig } from "../config/config";
import {
  DetectionLog,
  DetectionStats,
  TopOffender,
  DetectorBreakdown,
  TimeSeriesBucket,
  BlacklistEntry,
} from "../types/requestAnalysis";

export class DatabaseManager {
  private pool: Pool | null = null;
  private readonly pgConfig: HiluxPostgresConfig;
  private readonly thresholds: HiluxConfig["thresholds"];
  private memoryBlacklist: BlacklistEntry[] = [
    { ip: "203.0.113.5", reason: "Automatic ban by behavior analysis", created_at: new Date(), expires_at: new Date(Date.now() + 86400000) }
  ];

  constructor(pgConfig: HiluxPostgresConfig, thresholds: HiluxConfig["thresholds"]) {
    this.pgConfig = pgConfig;
    this.thresholds = thresholds;
  }

  getPool(): Pool {
    if (!this.pgConfig.enabled) {
      return {
        query: async () => ({ rows: [], rowCount: 0 }),
        end: async () => { },
      } as unknown as Pool;
    }

    if (!this.pool) {
      this.pool = new Pool({
        host: this.pgConfig.host,
        port: this.pgConfig.port,
        user: this.pgConfig.user,
        password: this.pgConfig.password,
        database: this.pgConfig.database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return this.pool;
  }

  async init(): Promise<void> {
    if (!this.pgConfig.enabled) return;
    const db = this.getPool();

    await db.query(`
      CREATE TABLE IF NOT EXISTS detection_logs (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        path VARCHAR(2048) NOT NULL,
        method VARCHAR(10) NOT NULL DEFAULT 'GET',
        user_agent VARCHAR(1024) NOT NULL DEFAULT '',
        risk_score INTEGER NOT NULL,
        classification VARCHAR(20) NOT NULL DEFAULT 'allow',
        reasons TEXT[] NOT NULL DEFAULT '{}',
        detector_details JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        ip VARCHAR(45) PRIMARY KEY,
        reason VARCHAR(512) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_detection_logs_ip ON detection_logs (ip)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_detection_logs_created_at ON detection_logs (created_at)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_detection_logs_classification ON detection_logs (classification)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_detection_logs_risk_score ON detection_logs (risk_score)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ip_blacklist (expires_at)`
    );
  }

  async saveLog(log: DetectionLog): Promise<void> {
    if (!this.pgConfig.enabled) return;
    const db = this.getPool();
    await db.query(
      `INSERT INTO detection_logs (ip, path, method, user_agent, risk_score, classification, reasons, detector_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        log.ip,
        log.path,
        log.method,
        log.user_agent,
        log.risk_score,
        log.classification,
        log.reasons,
        JSON.stringify(log.detector_details),
      ]
    );
  }

  async getStats(): Promise<DetectionStats> {
    if (!this.pgConfig.enabled) {
      return { total_requests: 12450, total_blocked: 423, total_suspicious: 1205, total_allowed: 10822 };
    }
    const db = this.getPool();
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE classification = 'block') as blocked,
        COUNT(*) FILTER (WHERE classification = 'suspicious') as suspicious,
        COUNT(*) FILTER (WHERE classification = 'allow') as allowed
      FROM detection_logs
    `);

    const row = result.rows[0];
    return {
      total_requests: parseInt(row.total, 10),
      total_blocked: parseInt(row.blocked, 10),
      total_suspicious: parseInt(row.suspicious, 10),
      total_allowed: parseInt(row.allowed, 10),
    };
  }

  async getTopOffenders(limit: number = 10): Promise<TopOffender[]> {
    if (!this.pgConfig.enabled) {
      return [
        { ip: "192.168.1.100", total_hits: 245, avg_score: 85, last_seen: new Date() },
        { ip: "10.0.0.45", total_hits: 120, avg_score: 72, last_seen: new Date() },
      ].slice(0, limit);
    }
    const db = this.getPool();
    const result = await db.query(
      `SELECT
         ip,
         COUNT(*) as total_hits,
         ROUND(AVG(risk_score), 2) as avg_score,
         MAX(created_at) as last_seen
       FROM detection_logs
       WHERE classification IN ('block', 'suspicious')
       GROUP BY ip
       ORDER BY total_hits DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      ip: row.ip,
      total_hits: parseInt(row.total_hits, 10),
      avg_score: parseFloat(row.avg_score),
      last_seen: row.last_seen,
    }));
  }

  async getDetectorBreakdown(): Promise<DetectorBreakdown[]> {
    if (!this.pgConfig.enabled) {
      return [
        { detector: "RateLimit", trigger_count: 520, avg_score: 40 },
        { detector: "Behavior", trigger_count: 150, avg_score: 65 },
        { detector: "Payload", trigger_count: 85, avg_score: 95 },
      ];
    }
    const db = this.getPool();
    const result = await db.query(`
      SELECT
        key as detector,
        COUNT(*) as trigger_count,
        ROUND(AVG(value::text::numeric), 2) as avg_score
      FROM detection_logs,
           jsonb_each(detector_details) as kv(key, value)
      WHERE value::text::numeric > 0
      GROUP BY key
      ORDER BY trigger_count DESC
    `);

    return result.rows.map((row) => ({
      detector: row.detector,
      trigger_count: parseInt(row.trigger_count, 10),
      avg_score: parseFloat(row.avg_score),
    }));
  }

  async getTimeSeries(
    intervalMinutes: number = 60,
    limitBuckets: number = 24
  ): Promise<TimeSeriesBucket[]> {
    if (!this.pgConfig.enabled) {
      const mock: TimeSeriesBucket[] = [];
      for (let i = limitBuckets; i > 0; i--) {
        const d = new Date();
        d.setMinutes(d.getMinutes() - i * intervalMinutes);
        mock.push({ bucket: d, total: 300 + i * 5, blocked: 20, suspicious: 50, allowed: 230 + i * 5 });
      }
      return mock;
    }
    const db = this.getPool();
    const result = await db.query(
      `SELECT
         date_trunc('hour', created_at) +
           (EXTRACT(minute FROM created_at)::int / $1) * ($1 || ' minutes')::interval as bucket,
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE classification = 'block') as blocked,
         COUNT(*) FILTER (WHERE classification = 'suspicious') as suspicious,
         COUNT(*) FILTER (WHERE classification = 'allow') as allowed
       FROM detection_logs
       WHERE created_at > NOW() - ($2 * ($1 || ' minutes')::interval)
       GROUP BY bucket
       ORDER BY bucket DESC
       LIMIT $2`,
      [intervalMinutes, limitBuckets]
    );

    return result.rows.map((row) => ({
      bucket: row.bucket,
      total: parseInt(row.total, 10),
      blocked: parseInt(row.blocked, 10),
      suspicious: parseInt(row.suspicious, 10),
      allowed: parseInt(row.allowed, 10),
    }));
  }

  async addToBlacklist(
    ip: string,
    reason: string,
    durationSeconds?: number
  ): Promise<void> {
    const expiresAt = durationSeconds
      ? new Date(Date.now() + durationSeconds * 1000)
      : undefined;

    if (!this.pgConfig.enabled) {
      this.memoryBlacklist = this.memoryBlacklist.filter(entry => entry.ip !== ip);
      this.memoryBlacklist.push({ ip, reason, created_at: new Date(), expires_at: expiresAt || new Date(Date.now() + 86400000) });
      return;
    }

    const db = this.getPool();
    await db.query(
      `INSERT INTO ip_blacklist (ip, reason, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip) DO UPDATE SET reason = $2, expires_at = $3, created_at = NOW()`,
      [ip, reason, expiresAt || null]
    );
  }

  async removeFromBlacklist(ip: string): Promise<boolean> {
    if (!this.pgConfig.enabled) {
      const initialLength = this.memoryBlacklist.length;
      this.memoryBlacklist = this.memoryBlacklist.filter(entry => entry.ip !== ip);
      return this.memoryBlacklist.length < initialLength;
    }
    const db = this.getPool();
    const result = await db.query(
      `DELETE FROM ip_blacklist WHERE ip = $1`,
      [ip]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isBlacklisted(ip: string): Promise<boolean> {
    if (!this.pgConfig.enabled) { return false; }
    const db = this.getPool();
    const result = await db.query(
      `SELECT 1 FROM ip_blacklist
       WHERE ip = $1 AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [ip]
    );
    return result.rows.length > 0;
  }

  async getBlacklist(): Promise<BlacklistEntry[]> {
    if (!this.pgConfig.enabled) {
      return [...this.memoryBlacklist].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    const db = this.getPool();
    const result = await db.query(
      `SELECT ip, reason, created_at, expires_at
       FROM ip_blacklist
       WHERE expires_at IS NULL OR expires_at > NOW()
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async addToWhitelist(ip: string, reason: string): Promise<void> {
    const db = this.getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS ip_whitelist (
        ip VARCHAR(45) PRIMARY KEY,
        reason VARCHAR(512) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(
      `INSERT INTO ip_whitelist (ip, reason) VALUES ($1, $2)
       ON CONFLICT (ip) DO UPDATE SET reason = $2`,
      [ip, reason]
    );
  }

  async removeFromWhitelist(ip: string): Promise<boolean> {
    const db = this.getPool();
    const result = await db.query(`DELETE FROM ip_whitelist WHERE ip = $1`, [ip]);
    return (result.rowCount ?? 0) > 0;
  }

  async isWhitelisted(ip: string): Promise<boolean> {
    const db = this.getPool();
    try {
      const result = await db.query(`SELECT 1 FROM ip_whitelist WHERE ip = $1 LIMIT 1`, [ip]);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  async getWhitelist(): Promise<any[]> {
    const db = this.getPool();
    try {
      const result = await db.query(`SELECT * FROM ip_whitelist ORDER BY created_at DESC`);
      return result.rows;
    } catch {
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.pgConfig.enabled) return true;
    try {
      const db = this.getPool();
      await db.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
