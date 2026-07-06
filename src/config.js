/**
 * Centralised, environment-driven configuration.
 * No secrets are ever hard-coded; everything comes from the environment.
 */

function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),

  cors: {
    // Split comma-separated origins; '*' allows any (intended for local dev only).
    origin:
      (process.env.CORS_ORIGIN || '*')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
  },

  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: int(process.env.RATE_LIMIT_MAX, 60),
  },

  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    timeoutMs: int(process.env.LLM_TIMEOUT_MS, 15_000),
    get enabled() {
      return Boolean(this.apiKey);
    },
  },
};

export default config;
