import type { VercelRequest, VercelResponse } from "@vercel/node";
import z from "zod";

import { describeTurnError, preStreamError, type PreStreamErrorKind } from "./_lib/aiErrors.js";
import { runAiTurn } from "./_lib/aiHandler.js";
import { bootstrapAiRoute } from "./_lib/aiRoute.js";
import type { OpenRouterLike } from "./_lib/openrouterClient.js";
import { createLimiter } from "./_lib/ratelimit.js";
import { AiRequestSchema } from "./_lib/schema.js";
import type { SseSink } from "./_lib/sse.js";

// Re-exported so the route module stays the public entry point for error
// description (api/ai.test.ts imports it from here).
export { describeTurnError };

function posIntEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function handleAiRequest(args: {
  method: string;
  body: unknown;
  ip: string;
  env: NodeJS.ProcessEnv;
  client: OpenRouterLike;
  sink: SseSink;
  respondError: (status: number, body: unknown) => void;
}): Promise<void> {
  const { method, body, ip, env, client, sink, respondError } = args;

  // All client-facing failure copy comes from aiErrors so the wording stays
  // consistent with the mid-stream errors described by describeTurnError.
  const fail = (kind: PreStreamErrorKind, retryAfter?: number) => {
    const { status, body: errorBody } = preStreamError(kind, retryAfter);
    respondError(status, errorBody);
  };

  if (method !== "POST") return fail("method_not_allowed");
  if ((env.AI_ENABLED ?? "true") === "false") return fail("disabled");
  if (!env.OPENROUTER_API_KEY) {
    console.error(
      "[api/ai] OPENROUTER_API_KEY is not set — returning 500. Set it in .env (dev) or the Vercel env (prod).",
    );
    return fail("server_config");
  }

  const { data, error } = z.safeParse(AiRequestSchema, body);
  if (error) return fail("bad_request");

  const limiter = createLimiter(env);
  const rl = await limiter.limit(ip);
  if (!rl.ok) return fail("rate_limit", rl.retryAfterSeconds);

  try {
    await runAiTurn(
      data,
      {
        client,
        model: env.AI_MODEL ?? "anthropic/claude-sonnet-5",
        maxTokens: posIntEnv(env.AI_MAX_TOKENS, 8192),
        maxRoundTrips: posIntEnv(env.AI_MAX_ROUND_TRIPS, 10),
      },
      sink,
    );
  } catch (err) {
    console.error("[api/ai] turn failed:", err);
    sink.send("error", describeTurnError(err));
    sink.end();
  }
}

function clientIp(req: VercelRequest): string {
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length) return fwd[0];
  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { sink, client, respondError } = bootstrapAiRoute(res);

  await handleAiRequest({
    method: req.method ?? "GET",
    body: req.body,
    ip: clientIp(req),
    env: process.env,
    client,
    sink,
    respondError,
  });
}
