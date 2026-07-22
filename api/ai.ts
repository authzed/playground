import type { VercelRequest, VercelResponse } from "@vercel/node";
import z from "zod";

import { runAiTurn } from "./_lib/aiHandler.js";
import { bootstrapAiRoute } from "./_lib/aiRoute.js";
import type { OpenRouterLike } from "./_lib/openrouterClient.js";
import { createLimiter } from "./_lib/ratelimit.js";
import { AiRequestSchema } from "./_lib/schema.js";
import type { SseSink } from "./_lib/sse.js";

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

  if (method !== "POST") return respondError(405, { error: "Method not allowed" });
  if ((env.AI_ENABLED ?? "true") === "false") {
    return respondError(503, { error: "AI assistant is disabled" });
  }
  if (!env.OPENROUTER_API_KEY) {
    console.error(
      "[api/ai] OPENROUTER_API_KEY is not set — returning 500. Set it in .env (dev) or the Vercel env (prod).",
    );
    return respondError(500, { error: "Server configuration error" });
  }

  const { data, error } = z.safeParse(AiRequestSchema, body);
  if (error) return respondError(400, { error: "Invalid request body" });

  const limiter = createLimiter(env);
  const rl = await limiter.limit(ip);
  if (!rl.ok) {
    return respondError(429, { error: "Rate limit exceeded", retryAfter: rl.retryAfterSeconds });
  }

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

// Reads the `retry-after` header (seconds) from an upstream error, tolerating
// both a Headers object and a plain record.
function retryAfterSeconds(err: unknown): number | undefined {
  const headers = (err as { headers?: unknown }).headers;
  let raw: string | null | undefined;
  if (headers && typeof (headers as Headers).get === "function") {
    raw = (headers as Headers).get("retry-after");
  } else if (headers && typeof headers === "object") {
    raw = (headers as Record<string, string>)["retry-after"];
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Maps an error thrown during the turn to a client-facing SSE error. Upstream
// rate limits and overloads get a clear, actionable message (and retry timing)
// instead of an opaque failure.
export function describeTurnError(err: unknown): {
  code: string;
  message: string;
  retryAfter?: number;
} {
  const status = (err as { status?: number }).status;
  if (status === 429) {
    return {
      code: "rate_limit",
      message: "The AI service is rate limited. Please wait a moment and try again.",
      retryAfter: retryAfterSeconds(err),
    };
  }
  if (status === 502 || status === 503 || status === 529) {
    return {
      code: "overloaded",
      message: "The AI service is temporarily overloaded. Please try again shortly.",
    };
  }
  return { code: "server_error", message: (err as Error).message || "The request failed." };
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
