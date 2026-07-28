import { ParagraphBreakTracker } from "./paragraphBreak";
import type { ToolRegistry } from "./registry";
import type {
  ChatMessage,
  ClientToolCall,
  DisplayArtifact,
  SseEvent,
  ToolMessage,
  WireTool,
} from "./types";
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
  // Tool activity is bracketed so the UI can show an in-progress chip for the
  // duration of the call rather than only after it resolves. `id` is the tool
  // call id and correlates the two.
  onToolStart: (a: { id: string; name: string }) => void;
  onToolEnd: (a: { id: string; name: string; summary: string; ok: boolean }) => void;
  // Transient "what's happening now" label; null clears it.
  onStatus: (label: string | null) => void;
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
    // A server-tool status label applies only until the model produces output
    // again — tracked so it can be cleared exactly once.
    let statusActive = false;
    const clearStatus = () => {
      if (!statusActive) return;
      statusActive = false;
      deps.onStatus(null);
    };
    paragraphBreaks.nextTrip();

    try {
      const stream = deps.stream({
        messages,
        state: deps.getState(),
        tools: deps.registry.toWire(),
      });

      try {
        for await (const ev of stream) {
          if (ev.event === "text") {
            clearStatus();
            deps.onText(paragraphBreaks.apply(ev.data.delta));
          } else if (ev.event === "status") {
            statusActive = true;
            deps.onStatus(ev.data.label);
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
      } finally {
        // Runs on every exit from the loop above — normal completion, an
        // AbortError from the user clicking Stop, or any other stream
        // failure — so a server-tool status label is never left stuck in
        // the UI when the stream doesn't resume with text/done.
        clearStatus();
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

    for (const call of handoff.malformedClientToolCalls ?? []) {
      // Never executed, but still bracketed so the UI has one uniform path
      // from start to resolution for every call it displays.
      deps.onToolStart({ id: call.id, name: call.name });
      deps.onToolEnd({ id: call.id, name: call.name, summary: "malformed arguments", ok: false });
    }

    for (const call of handoff.clientToolCalls) {
      messages.push(await executeClientTool(call, deps));
    }
  }

  return { messages, error: { message: "Reached the step limit for this turn." } };
}

// Defers to the next macrotask so the browser can paint work queued by the
// callback that ran just before it. `setTimeout` rather than
// requestAnimationFrame: rAF fires *before* paint (so synchronous work in its
// callback still blocks the frame), and it doesn't exist under Node in tests.
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function executeClientTool(call: ClientToolCall, deps: TurnDeps): Promise<ToolMessage> {
  // Announced before any validation so every displayed call — including the
  // ones rejected below — has a start that is guaranteed a matching end.
  deps.onToolStart({ id: call.id, name: call.name });
  const end = (summary: string, ok: boolean) =>
    deps.onToolEnd({ id: call.id, name: call.name, summary, ok });

  const tool = deps.registry.get(call.name);
  if (!tool) {
    end("unknown tool", false);
    return { role: "tool", tool_call_id: call.id, content: `Unknown tool "${call.name}".` };
  }

  const parsed = tool.parameters.safeParse(call.input);
  if (!parsed.success) {
    end("invalid input", false);
    return {
      role: "tool",
      tool_call_id: call.id,
      content: `Invalid input for ${call.name}: ${parsed.error.message}`,
    };
  }

  try {
    // Every client tool is synchronous, so without yielding here the start and
    // end callbacks land in the same macrotask: React batches both store writes
    // and paints once, with the chip already resolved. Handing the event loop a
    // turn lets the in-progress chip and status label actually render.
    await yieldToPaint();
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

    end(tool.summarize ? tool.summarize(result, parsed.data) : defaultSummarize(result), ok);
    // OpenAI's tool-role messages have no dedicated failure flag (unlike
    // Anthropic's is_error on tool_result blocks) — prefix the content so a
    // failing tool call is unambiguous to the model even when the tool's own
    // JSON payload doesn't self-describe failure (e.g. no ok/error field).
    const content = JSON.stringify(modelResult);
    return { role: "tool", tool_call_id: call.id, content: ok ? content : `Error: ${content}` };
  } catch (err) {
    end("error", false);
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
