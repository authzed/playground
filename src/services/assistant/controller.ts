import { ParagraphBreakTracker } from "./paragraphBreak";
import type { ToolRegistry } from "./registry";
import type { ChatMessage, ClientToolCall, DisplayArtifact, SseEvent, ToolMessage, WireTool } from "./types";
import type { ToolContext } from "./types";

export interface StateSnapshot {
  schema: string;
  relationships: string;
  assertions: string;
  expected: string;
}

export interface TurnDeps {
  stream: (req: {
    messages: ChatMessage[];
    state: StateSnapshot;
    tools: WireTool[];
  }) => AsyncGenerator<SseEvent>;
  registry: ToolRegistry;
  ctx: ToolContext;
  getState: () => StateSnapshot;
  maxRoundTrips?: number;
  onText: (delta: string) => void;
  onToolActivity: (a: { name: string; summary: string; ok: boolean }) => void;
  onArtifact: (artifact: DisplayArtifact) => void;
}

export interface TurnResult {
  messages: ChatMessage[];
  error?: { message: string; retryAfter?: number };
  // True when the turn ended because the caller aborted the stream (e.g. the
  // user clicked Stop) rather than a real failure — callers should treat this
  // as a clean stop, not surface `error` as a failure banner.
  aborted?: boolean;
}

export async function runAssistantTurn(
  startMessages: ChatMessage[],
  deps: TurnDeps,
): Promise<TurnResult> {
  const maxRoundTrips = deps.maxRoundTrips ?? 10;
  let messages = [...startMessages];

  // The model emits text across multiple round trips (a block of text, then tool
  // calls, then more text). Those blocks are appended into one message, so insert
  // a paragraph break before the first text of each later trip; otherwise the last
  // sentence of one block runs directly into the first of the next.
  const paragraphBreaks = new ParagraphBreakTracker();

  for (let trip = 0; trip < maxRoundTrips; trip++) {
    let handoff: Extract<SseEvent, { event: "handoff" }>["data"] | null = null;
    let doneErr: TurnResult["error"] | undefined;
    let finished = false;
    paragraphBreaks.nextTrip();

    try {
      const stream = deps.stream({
        messages,
        state: deps.getState(),
        tools: deps.registry.toWire(),
      });

      for await (const ev of stream) {
        if (ev.event === "text") {
          deps.onText(paragraphBreaks.apply(ev.data.delta));
        } else if (ev.event === "done") {
          messages.push(ev.data.assistantMessage);
          finished = true;
        } else if (ev.event === "error") {
          doneErr = { message: ev.data.message, retryAfter: ev.data.retryAfter };
          finished = true;
        } else if (ev.event === "handoff") {
          handoff = ev.data;
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return { messages, aborted: true };
      }
      return {
        messages,
        error: {
          message: (err as Error).message,
          retryAfter: (err as { retryAfter?: number }).retryAfter,
        },
      };
    }

    if (doneErr) return { messages, error: doneErr };
    if (finished && !handoff) return { messages };
    if (!handoff) return { messages }; // stream ended without done/handoff — treat as complete

    messages.push(handoff.assistantMessage);
    messages.push(...handoff.serverToolResults);

    for (const call of handoff.clientToolCalls) {
      messages.push(await executeClientTool(call, deps));
    }
  }

  return { messages, error: { message: "Reached the step limit for this turn." } };
}

async function executeClientTool(call: ClientToolCall, deps: TurnDeps): Promise<ToolMessage> {
  const tool = deps.registry.get(call.name);
  if (!tool) {
    deps.onToolActivity({ name: call.name, summary: "unknown tool", ok: false });
    return { role: "tool", tool_call_id: call.id, content: `Unknown tool "${call.name}".` };
  }

  const parsed = tool.parameters.safeParse(call.input);
  if (!parsed.success) {
    deps.onToolActivity({ name: call.name, summary: "invalid input", ok: false });
    return {
      role: "tool",
      tool_call_id: call.id,
      content: `Invalid input for ${call.name}: ${parsed.error.message}`,
    };
  }

  try {
    const result = await tool.execute(parsed.data, deps.ctx);
    const ok = tool.isError ? !tool.isError(result) : (result as { ok?: boolean }).ok !== false;

    // Rich rendering, model-facing redaction, error detection, and activity-chip
    // summaries are all declared per tool (render / redactFromModel / isError /
    // summarize) — the controller stays free of per-tool name checks.
    if (ok && tool.render) {
      const artifact = tool.render(result, parsed.data, deps.ctx);
      if (artifact) deps.onArtifact(artifact);
    }
    const modelResult = tool.redactFromModel?.length
      ? omitKeys(result, tool.redactFromModel)
      : result;

    deps.onToolActivity({
      name: call.name,
      summary: tool.summarize ? tool.summarize(result, parsed.data) : defaultSummarize(result),
      ok,
    });
    // OpenAI's tool-role messages have no dedicated failure flag (unlike
    // Anthropic's is_error on tool_result blocks) — prefix the content so a
    // failing tool call is unambiguous to the model even when the tool's own
    // JSON payload doesn't self-describe failure (e.g. no ok/error field).
    const content = JSON.stringify(modelResult);
    return { role: "tool", tool_call_id: call.id, content: ok ? content : `Error: ${content}` };
  } catch (err) {
    deps.onToolActivity({ name: call.name, summary: "error", ok: false });
    return {
      role: "tool",
      tool_call_id: call.id,
      content: `Tool ${call.name} threw: ${(err as Error).message}`,
    };
  }
}

function omitKeys(obj: unknown, keys: readonly string[]): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of keys) delete copy[key];
  return copy;
}

// Fallback used when a tool doesn't declare its own summarize().
function defaultSummarize(result: unknown): string {
  const r = (result ?? {}) as Record<string, unknown>;
  if (r.ok === false) return typeof r.error === "string" ? r.error : "failed";
  return "done";
}
