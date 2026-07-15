import type { ChatMessage, SseEvent, WireTool } from "./types";

export interface StreamRequest {
  endpoint: string;
  messages: ChatMessage[];
  state: { schema: string; relationships: string; assertions: string; expected: string };
  tools: WireTool[];
  signal?: AbortSignal;
}

export class RateLimitError extends Error {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export async function* streamAssistant(
  req: StreamRequest,
  fetchImpl: typeof fetch = fetch,
): AsyncGenerator<SseEvent> {
  const res = await fetchImpl(req.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: req.messages, state: req.state, tools: req.tools }),
    signal: req.signal,
  });

  if (!res.ok || !res.body) {
    let payload: { error?: string; retryAfter?: number } = {};
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    if (res.status === 429)
      throw new RateLimitError(payload.error ?? "Rate limit exceeded", payload.retryAfter);
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseFrame(frame);
      if (parsed) yield parsed;
    }
  }

  // Flush a final frame that arrived without a trailing blank line.
  buffer += decoder.decode();
  const tail = parseFrame(buffer);
  if (tail) yield tail;
}

function parseFrame(frame: string): SseEvent | null {
  let event = "";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!event) return null;
  try {
    return { event, data: JSON.parse(data || "{}") } as SseEvent;
  } catch {
    return null;
  }
}
