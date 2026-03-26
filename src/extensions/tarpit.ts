/**
 * Hilux Rate Shaping (Tarpit)
 * 
 * Instead of blocking suspicious requests outright, this module
 * introduces artificial latency proportional to the risk score.
 * This degrades the attacker's throughput while keeping legit
 * traffic unaffected.
 * 
 * The delay formula is:
 *   delay_ms = baseDelay + (score / maxScore) * maxDelay
 * 
 * A score of 0 = no delay. A score near the block threshold
 * gets close to maxDelay.
 */

export interface TarpitConfig {
  enabled: boolean;
  baseDelayMs: number;
  maxDelayMs: number;
  scoreThreshold: number;
}

const DEFAULT_TARPIT_CONFIG: TarpitConfig = {
  enabled: false,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  scoreThreshold: 20,
};

export function buildTarpitConfig(overrides?: Partial<TarpitConfig>): TarpitConfig {
  return { ...DEFAULT_TARPIT_CONFIG, ...overrides };
}

export function calculateDelay(
  riskScore: number,
  blockThreshold: number,
  config: TarpitConfig
): number {
  if (!config.enabled || riskScore < config.scoreThreshold) {
    return 0;
  }

  const normalizedScore = Math.min(riskScore / blockThreshold, 1);
  const delay = config.baseDelayMs + normalizedScore * (config.maxDelayMs - config.baseDelayMs);

  return Math.round(delay);
}

export function applyTarpit(delayMs: number): Promise<void> {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
