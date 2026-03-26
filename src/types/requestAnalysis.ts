export type Classification = "allow" | "suspicious" | "block";

export type DetectorName =
  | "rate"
  | "user-agent"
  | "header"
  | "ip"
  | "fingerprint"
  | "payload"
  | "behavior"
  | "reputation";

export interface AnalysisRequest {
  ip: string;
  path: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
  simulate?: boolean;
}

export interface DetectorResult {
  detector: DetectorName;
  score: number;
  reason: string | null;
}

export interface ThreatBreakdown {
  detector: DetectorName;
  score: number;
  reason: string;
}

export interface AnalysisResult {
  bot: boolean;
  risk_score: number;
  classification: Classification;
  confidence: number;
  reasons: string[];
  threat_breakdown: ThreatBreakdown[];
  tarpit_delay_ms?: number;
  challenge_required?: boolean;
}

export interface DetectionLog {
  id?: number;
  ip: string;
  path: string;
  method: string;
  user_agent: string;
  risk_score: number;
  classification: Classification;
  reasons: string[];
  detector_details: Record<string, number>;
  created_at?: Date;
}

export interface DetectionStats {
  total_requests: number;
  total_blocked: number;
  total_suspicious: number;
  total_allowed: number;
}

export interface TopOffender {
  ip: string;
  total_hits: number;
  avg_score: number;
  last_seen: Date;
}

export interface DetectorBreakdown {
  detector: string;
  trigger_count: number;
  avg_score: number;
}

export interface TimeSeriesBucket {
  bucket: Date;
  total: number;
  blocked: number;
  suspicious: number;
  allowed: number;
}

export interface DetailedStats extends DetectionStats {
  top_offenders: TopOffender[];
  detector_breakdown: DetectorBreakdown[];
  time_series: TimeSeriesBucket[];
}

export interface IpReputationInfo {
  ip: string;
  reputation_score: number;
  total_requests: number;
  total_violations: number;
  last_seen: number;
  auto_blacklisted: boolean;
}

export interface BlacklistEntry {
  ip: string;
  reason: string;
  created_at: Date;
  expires_at: Date | null;
}

export interface BehaviorProfile {
  unique_paths: number;
  request_interval_variance: number;
  avg_interval_ms: number;
  is_regular: boolean;
}

export interface HealthStatus {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  redis: { connected: boolean };
  postgres: { connected: boolean };
}
