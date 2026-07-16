import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}
export interface Limiter {
  limit(key: string): Promise<RateLimitResult>;
}

const NOOP_LIMITER: Limiter = {
  limit: () => Promise.resolve({ ok: true }),
};

export function resolvePerMinute(env: NodeJS.ProcessEnv): number {
  const parsed = Number(env.AI_RATELIMIT_PER_MINUTE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}

export function createLimiter(env: NodeJS.ProcessEnv): Limiter {
  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) return NOOP_LIMITER;

  const perMinute = resolvePerMinute(env);
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(perMinute, "60 s"),
    prefix: "ai-assistant",
  });

  return {
    async limit(key) {
      const { success, reset } = await ratelimit.limit(key);
      if (success) return { ok: true };
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
    },
  };
}
