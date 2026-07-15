import type { ToolRegistry } from "./registry";
import type {
  ChatMessage,
  ContentBlock,
  DisplayArtifact,
  SseEvent,
  ToolResultBlock,
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
  onToolActivity: (a: { name: string; summary: string; ok: boolean }) => void;
  onArtifact: (artifact: DisplayArtifact) => void;
}

export interface TurnResult {
  messages: ChatMessage[];
  error?: { message: string; retryAfter?: number };
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
  let hasEmittedText = false;

  for (let trip = 0; trip < maxRoundTrips; trip++) {
    let handoff: Extract<SseEvent, { event: "handoff" }>["data"] | null = null;
    let doneErr: TurnResult["error"] | undefined;
    let finished = false;
    let tripEmittedText = false;

    try {
      const stream = deps.stream({
        messages,
        state: deps.getState(),
        tools: deps.registry.toWire(),
      });

      for await (const ev of stream) {
        if (ev.event === "text") {
          const prefix = !tripEmittedText && hasEmittedText ? "\n\n" : "";
          tripEmittedText = true;
          hasEmittedText = true;
          deps.onText(prefix + ev.data.delta);
        } else if (ev.event === "done") {
          messages.push({ role: "assistant", content: ev.data.assistantContent });
          finished = true;
        } else if (ev.event === "error") {
          doneErr = { message: ev.data.message, retryAfter: ev.data.retryAfter };
          finished = true;
        } else if (ev.event === "handoff") {
          handoff = ev.data;
        }
      }
    } catch (err) {
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

    messages.push({ role: "assistant", content: handoff.assistantContent });

    const results: ToolResultBlock[] = handoff.serverToolResults.map((r) => ({
      type: "tool_result",
      tool_use_id: r.tool_use_id,
      content: r.content,
    }));

    for (const call of handoff.clientToolCalls) {
      results.push(await executeClientTool(call, deps));
    }

    messages.push({ role: "user", content: results as unknown as ContentBlock[] });
  }

  return { messages, error: { message: "Reached the step limit for this turn." } };
}

async function executeClientTool(
  call: { id: string; name: string; input: unknown },
  deps: TurnDeps,
): Promise<ToolResultBlock> {
  const tool = deps.registry.get(call.name);
  if (!tool) {
    deps.onToolActivity({ name: call.name, summary: "unknown tool", ok: false });
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: `Unknown tool "${call.name}".`,
      is_error: true,
    };
  }

  const parsed = tool.parameters.safeParse(call.input);
  if (!parsed.success) {
    deps.onToolActivity({ name: call.name, summary: "invalid input", ok: false });
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: `Invalid input for ${call.name}: ${parsed.error.message}`,
      is_error: true,
    };
  }

  try {
    const result = await tool.execute(parsed.data, deps.ctx);
    const ok = (result as { ok?: boolean }).ok !== false;

    // Rich rendering and model-facing redaction are declared per tool (render /
    // redactFromModel) — the controller stays free of per-tool name checks.
    if (ok && tool.render) {
      const artifact = tool.render(result, parsed.data, deps.ctx);
      if (artifact) deps.onArtifact(artifact);
    }
    const modelResult = tool.redactFromModel?.length
      ? omitKeys(result, tool.redactFromModel)
      : result;

    deps.onToolActivity({
      name: call.name,
      summary: summarize(call.name, result, parsed.data),
      ok,
    });
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: JSON.stringify(modelResult),
      is_error: !ok,
    };
  } catch (err) {
    deps.onToolActivity({ name: call.name, summary: "error", ok: false });
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: `Tool ${call.name} threw: ${(err as Error).message}`,
      is_error: true,
    };
  }
}

function omitKeys(obj: unknown, keys: readonly string[]): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of keys) delete copy[key];
  return copy;
}

function summarize(name: string, result: unknown, input: unknown): string {
  const r = (result ?? {}) as Record<string, unknown>;
  const inp = (input ?? {}) as Record<string, unknown>;
  const err = typeof r.error === "string" ? r.error : undefined;

  // Tools whose result carries its own outcome (a check/validation verdict, an edit
  // summary) are handled before the generic failure check below.
  if (name === "run_check" || name === "explain_check") {
    return typeof r.result === "string" ? `check ⟹ ${r.result}` : "check ⟹ ";
  }
  if (name === "run_validation") return r.passed ? "validation passed" : "validation failed";
  if (name === "edit_document") {
    if (typeof r.applied_summary === "string" && r.applied_summary) return r.applied_summary;
    if (r.ok) return "edited";
    return err ?? "error";
  }

  // For the remaining tools, surface the error on failure rather than success text.
  if (r.ok === false) return err ?? "failed";

  if (name === "open_tab_to_line") {
    const target = typeof inp.target === "string" ? inp.target : "tab";
    return typeof inp.line === "number" ? `opened ${target}:${inp.line}` : `opened ${target}`;
  }
  if (name === "add_check_watch") {
    return typeof r.current_result === "string"
      ? `watch added ⟹ ${r.current_result}`
      : "watch added";
  }
  if (name === "list_check_watches") {
    const count = Array.isArray(r.watches) ? r.watches.length : 0;
    return `${count} watch${count === 1 ? "" : "es"}`;
  }
  if (name === "update_check_watch") return "watch updated";
  if (name === "remove_check_watch") return "watch removed";

  return "done";
}
