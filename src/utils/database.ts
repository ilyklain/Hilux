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

  constructor(pgConfig: HiluxPostgresConfig, thresholds: HiluxConfig["thresholds"]) {
    this.pgConfig = pgConfig;
    this.thresholds = thresholds;
  }

  getPool(): Pool {
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
    const db = this.getPool();
    const expiresAt = durationSeconds
      ? new Date(Date.now() + durationSeconds * 1000)
      : null;

    await db.query(
      `INSERT INTO ip_blacklist (ip, reason, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip) DO UPDATE SET reason = $2, expires_at = $3, created_at = NOW()`,
      [ip, reason, expiresAt]
    );
  }

  async removeFromBlacklist(ip: string): Promise<boolean> {
    const db = this.getPool();
    const result = await db.query(
      `DELETE FROM ip_blacklist WHERE ip = $1`,
      [ip]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isBlacklisted(ip: string): Promise<boolean> {
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
    const db = this.getPool();
    const result = await db.query(
      `SELECT ip, reason, created_at, expires_at
       FROM ip_blacklist
       WHERE expires_at IS NULL OR expires_at > NOW()
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async isHealthy(): Promise<boolean> {
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
