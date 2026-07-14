import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import z from "zod";

import { type AnthropicLike, runAiTurn } from "./_lib/aiHandler";
import { createLimiter } from "./_lib/ratelimit";
import { AiRequestSchema } from "./_lib/schema";
import { createWritableSseSink, type SseSink } from "./_lib/sse";

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
  if (!env.ANTHROPIC_API_KEY) return respondError(500, { error: "Server configuration error" });

  const { data, error } = z.safeParse(AiRequestSchema, body);
  if (error) return respondError(400, { error: "Invalid request body" });

  const limiter = createLimiter(env);
  const rl = await limiter.limit(ip);
  if (!rl.ok) {
    return respondError(429, { error: "Rate limit exceeded", retryAfter: rl.retryAfterSeconds });
  }

  await runAiTurn(
    data,
    {
      anthropic,
      model: env.AI_MODEL ?? "claude-sonnet-5",
      maxTokens: Number(env.AI_MAX_TOKENS ?? "8192"),
      maxRoundTrips: Number(env.AI_MAX_ROUND_TRIPS ?? "10"),
    },
    sink,
  );
}

function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
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
      sink.send("error", body);
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
