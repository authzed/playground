import { createOpenRouterClient, type OpenRouterLike } from "./openrouterClient.js";
import { createWritableSseSink, type SseSink } from "./sse.js";

// A minimal shape covering both VercelResponse and Node's ServerResponse, the
// two response types the AI route runs behind (prod vs local dev).
export interface AiRouteResponse {
  readonly headersSent: boolean;
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  write(chunk: string): unknown;
  end(chunk?: string): unknown;
}

export interface AiRouteBootstrap {
  sink: SseSink;
  client: OpenRouterLike;
  respondError: (status: number, body: unknown) => void;
}

/**
 * Sets up the SSE response headers/sink, the OpenRouter client, and a
 * respondError closure shared by the production (api/ai.ts) and local dev
 * (dev-api/index.ts) entry points for the /api/ai route.
 */
export function bootstrapAiRoute(res: AiRouteResponse): AiRouteBootstrap {
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

  // For now, use ANTHROPIC_API_KEY as the OpenRouter API key. Task 5 will
  // swap this to use the proper OPENROUTER_API_KEY env var.
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY || "";
  const client = createOpenRouterClient(apiKey);

  return { sink, client, respondError };
}
