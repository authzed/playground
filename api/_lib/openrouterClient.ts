import type { EventSourceMessage } from "eventsource-parser";
import { EventSourceParserStream } from "eventsource-parser/stream";

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
}

export interface OpenRouterToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface OpenRouterRequestParams {
  model: string;
  max_tokens: number;
  messages: OpenRouterMessage[];
  tools: OpenRouterToolDef[];
}

export interface OpenRouterFinalMessage {
  message: OpenRouterMessage;
  finish_reason: string;
}

export interface OpenRouterStreamLike {
  on(event: "text", cb: (delta: string) => void): void;
  finalMessage(): Promise<OpenRouterFinalMessage>;
}

export interface OpenRouterLike {
  stream(params: OpenRouterRequestParams): OpenRouterStreamLike;
}

export class OpenRouterApiError extends Error {
  status: number;
  headers: Headers;
  constructor(message: string, status: number, headers: Headers) {
    super(message);
    this.name = "OpenRouterApiError";
    this.status = status;
    this.headers = headers;
  }
}

interface ToolCallAccumulator {
  id?: string;
  type?: "function";
  name: string;
  arguments: string;
}

export interface StreamAccumulator {
  content: string;
  toolCalls: Map<number, ToolCallAccumulator>;
  finishReason: string | null;
}

export function createAccumulator(): StreamAccumulator {
  return { content: "", toolCalls: new Map(), finishReason: null };
}

interface RawDeltaToolCall {
  index: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
}
interface RawChunk {
  error?: { message?: string; code?: number | string };
  choices?: [{ delta?: { content?: string; tool_calls?: RawDeltaToolCall[] }; finish_reason?: string }];
}

// Once tokens have already streamed, OpenRouter can't change the committed
// HTTP 200 status, so a mid-stream failure arrives as an inline `error` with
// a string type code (e.g. "server_error") rather than a real HTTP status —
// confirmed against https://openrouter.ai/docs/api_reference/streaming#handling-errors-during-streaming.
// Accept a real number too (belt and suspenders, and it parses a numeric
// string like "429" if one ever appears) and fall back to a generic server
// error for any other string, rather than comparing it against
// describeTurnError's numeric status checks and silently mismatching all of
// them.
function normalizeErrorCode(code: number | string | undefined): number {
  if (typeof code === "number") return code;
  if (typeof code === "string") {
    const parsed = Number(code);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 500;
}

/**
 * Folds one raw chat-completion chunk into `acc`, returning any new text this
 * chunk added (empty string if none). Throws OpenRouterApiError if the chunk
 * carries an inline provider error (OpenRouter's mid-stream failure shape).
 */
export function accumulateChunk(acc: StreamAccumulator, chunk: RawChunk): string {
  if (chunk.error) {
    throw new OpenRouterApiError(
      chunk.error.message ?? "OpenRouter stream error",
      normalizeErrorCode(chunk.error.code),
      new Headers(),
    );
  }
  const choice = chunk.choices?.[0];
  if (!choice) return "";
  const delta = choice.delta ?? {};
  const textDelta = typeof delta.content === "string" ? delta.content : "";
  if (textDelta) acc.content += textDelta;
  for (const tc of delta.tool_calls ?? []) {
    const existing = acc.toolCalls.get(tc.index) ?? { name: "", arguments: "" };
    if (tc.id) existing.id = tc.id;
    if (tc.type) existing.type = tc.type;
    if (tc.function?.name) existing.name += tc.function.name;
    if (tc.function?.arguments) existing.arguments += tc.function.arguments;
    acc.toolCalls.set(tc.index, existing);
  }
  if (choice.finish_reason) acc.finishReason = choice.finish_reason;
  return textDelta;
}

export function finalizeAccumulator(acc: StreamAccumulator): OpenRouterFinalMessage {
  const toolCalls = [...acc.toolCalls.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, tc]) => ({
      id: tc.id ?? "",
      type: "function" as const,
      function: { name: tc.name, arguments: tc.arguments },
    }));
  return {
    message: {
      role: "assistant",
      content: acc.content || null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    },
    finish_reason: acc.finishReason ?? "stop",
  };
}

export function createOpenRouterClient(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = "https://openrouter.ai/api/v1",
): OpenRouterLike {
  return {
    stream(params) {
      const textCallbacks: ((delta: string) => void)[] = [];
      const finalMessage = runStream(apiKey, fetchImpl, baseUrl, params, (delta) => {
        for (const cb of textCallbacks) cb(delta);
      });
      return {
        on(event, cb) {
          if (event === "text") textCallbacks.push(cb);
        },
        finalMessage: () => finalMessage,
      };
    },
  };
}

async function runStream(
  apiKey: string,
  fetchImpl: typeof fetch,
  baseUrl: string,
  params: OpenRouterRequestParams,
  onText: (delta: string) => void,
): Promise<OpenRouterFinalMessage> {
  const res = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...params, stream: true }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}) as { error?: { message?: string } });
    throw new OpenRouterApiError(
      body?.error?.message ?? `OpenRouter request failed (${res.status})`,
      res.status,
      res.headers,
    );
  }

  const acc = createAccumulator();
  const events = res.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream());

  for await (const event of events as unknown as AsyncIterable<EventSourceMessage>) {
    if (event.data === "[DONE]") continue;
    let chunk: RawChunk;
    try {
      chunk = JSON.parse(event.data);
    } catch {
      continue;
    }
    const delta = accumulateChunk(acc, chunk);
    if (delta) onText(delta);
  }

  return finalizeAccumulator(acc);
}
