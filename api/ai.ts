import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import z from "zod";

import { type AnthropicLike, runAiTurn } from "./_lib/aiHandler";
import { createLimiter } from "./_lib/ratelimit";
import { AiRequestSchema } from "./_lib/schema";
import { createWritableSseSink, type SseSink } from "./_lib/sse";

function posIntEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function handleAiRequest(args: {
  method: string;
  body: unknown;
  ip: string;
  env: NodeJS.ProcessEnv;
  anthropic: AnthropicLike;
  sink: SseSink;
  respondError: (status: number, body: unknown) => void;
}): Promise<void> {
  const { method, body, ip, env, anthropic, sink, respondError } = args;

  if (method !== "POST") return respondError(405, { error: "Method not allowed" });
  if ((env.AI_ENABLED ?? "true") === "false") {
    return respondError(503, { error: "AI assistant is disabled" });
  }
  if (!env.ANTHROPIC_API_KEY) {
    console.error(
      "[api/ai] ANTHROPIC_API_KEY is not set — returning 500. Set it in .env (dev) or the Vercel env (prod).",
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
        anthropic,
        model: env.AI_MODEL ?? "claude-sonnet-5",
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
  if (status === 503 || status === 529) {
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
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sink = createWritableSseSink(
    (chunk) => res.write(chunk),
    () => res.end(),
  );

  const respondError = (status: number, body: unknown) => {
    // If headers already sent (mid-stream), surface as an SSE error instead.
    if (res.headersSent) {
      sink.send("error", {
        message: (body as { error?: string }).error ?? "Server error",
        retryAfter: (body as { retryAfter?: number }).retryAfter,
      });
      sink.end();
      return;
    }
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages;

  await handleAiRequest({
    method: req.method ?? "GET",
    body: req.body,
    ip: clientIp(req),
    env: process.env,
    anthropic: anthropic as unknown as AnthropicLike,
    sink,
    respondError,
  });
}
