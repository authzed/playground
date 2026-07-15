import type { ToolRegistry } from "./registry";
import { KIND_BY_TARGET } from "./tools/editDocument";
import type { ChatMessage, ContentBlock, SseEvent, ToolResultBlock, WireTool } from "./types";
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
  onDiff: (d: { target: string; before: string; after: string }) => void;
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

  for (let trip = 0; trip < maxRoundTrips; trip++) {
    let handoff: Extract<SseEvent, { event: "handoff" }>["data"] | null = null;
    let doneErr: TurnResult["error"] | undefined;
    let finished = false;

    try {
      const stream = deps.stream({
        messages,
        state: deps.getState(),
        tools: deps.registry.toWire(),
      });

      for await (const ev of stream) {
        if (ev.event === "text") {
          deps.onText(ev.data.delta);
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

  // Capture a diff for edit_document.
  let before: string | undefined;
  const target = (parsed.data as { target?: keyof typeof KIND_BY_TARGET }).target;

  try {
    if (call.name === "edit_document" && target) {
      before = deps.ctx.datastore.getSingletonByKind(KIND_BY_TARGET[target]).editableContents;
    }
    const result = await tool.execute(parsed.data, deps.ctx);
    const ok = (result as { ok?: boolean }).ok !== false;

    if (call.name === "edit_document" && target && before !== undefined && ok) {
      const after = deps.ctx.datastore.getSingletonByKind(KIND_BY_TARGET[target]).editableContents;
      deps.onDiff({ target, before, after });
    }

    deps.onToolActivity({ name: call.name, summary: summarize(call.name, result), ok });
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: JSON.stringify(result),
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

function summarize(name: string, result: unknown): string {
  const r = result as Record<string, unknown>;
  if (name === "run_check") {
    if (typeof r.result === "string") {
      return `check ⟹ ${r.result}`;
    }
    return "check ⟹ ";
  }
  if (name === "run_validation") return r.passed ? "validation passed" : "validation failed";
  if (name === "edit_document") {
    if (r.applied_summary && typeof r.applied_summary === "string") {
      return r.applied_summary;
    }
    if (r.ok) {
      return "edited";
    }
    if (r.error && typeof r.error === "string") {
      return r.error;
    }
    return "error";
  }
  if (r.ok === false) {
    if (r.error && typeof r.error === "string") {
      return r.error;
    }
    return "failed";
  }
  return "done";
}
