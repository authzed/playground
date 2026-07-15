import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { runAssistantTurn } from "./controller";
import { ToolRegistry } from "./registry";
import type { ChatMessage, SseEvent } from "./types";
import { NOOP_HISTORY, type ToolContext } from "./types";

function gen(events: SseEvent[]): () => AsyncGenerator<SseEvent> {
  return async function* () {
    for (const e of events) yield e;
  };
}

const ctx: ToolContext = {
  datastore: { getSingletonByKind: () => ({ editableContents: "before" }) } as any,
  getServices: () => ({}) as any,
  reveal: vi.fn(),
  openDocument: vi.fn(),
  openWatchesPanel: vi.fn(),
  history: NOOP_HISTORY,
};

const baseDeps = {
  registry: new ToolRegistry(),
  ctx,
  getState: () => ({ schema: "", relationships: "", assertions: "", expected: "" }),
  onText: vi.fn(),
  onToolActivity: vi.fn(),
  onDiff: vi.fn(),
};

describe("runAssistantTurn", () => {
  it("streams text and finishes on done", async () => {
    const onText = vi.fn();
    const stream = gen([
      { event: "text", data: { delta: "hi" } },
      {
        event: "done",
        data: { assistantContent: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
      },
    ]);
    const start: ChatMessage[] = [{ role: "user", content: "yo" }];
    const result = await runAssistantTurn(start, { ...baseDeps, onText, stream: stream as any });
    expect(onText).toHaveBeenCalledWith("hi");
    expect(result.messages[result.messages.length - 1]).toEqual({
      role: "assistant",
      content: [{ type: "text", text: "hi" }],
    });
    expect(result.error).toBeUndefined();
  });

  it("executes a client tool on handoff and re-requests", async () => {
    const registry = new ToolRegistry();
    const execute = vi.fn(() => ({ result: "allowed" }));
    registry.register({
      name: "run_check",
      description: "d",
      parameters: z.object({ resource: z.string() }),
      execute,
    });

    let _call = 0;
    const stream = (() => {
      const frames: SseEvent[][] = [
        [
          {
            event: "handoff",
            data: {
              assistantContent: [
                { type: "tool_use", id: "t1", name: "run_check", input: { resource: "doc:x" } },
              ],
              serverToolResults: [],
              clientToolCalls: [{ id: "t1", name: "run_check", input: { resource: "doc:x" } }],
            },
          },
        ],
        [
          {
            event: "done",
            data: { assistantContent: [{ type: "text", text: "done" }], stop_reason: "end_turn" },
          },
        ],
      ];
      return async function* () {
        for (const e of frames[_call++]) yield e;
      };
    })();

    const result = await runAssistantTurn([{ role: "user", content: "check it" }], {
      ...baseDeps,
      registry,
      stream: stream as any,
    });

    expect(execute).toHaveBeenCalledWith({ resource: "doc:x" }, ctx);
    // messages: user, assistant(tool_use), user(tool_result), assistant(text)
    expect(result.messages).toHaveLength(4);
    const toolResultMsg = result.messages[2] as any;
    expect(toolResultMsg.content[0]).toMatchObject({ type: "tool_result", tool_use_id: "t1" });
  });

  it("returns a step_limit error when round trips are exhausted", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "noop",
      description: "d",
      parameters: z.object({}),
      execute: () => ({}),
    });
    const stream = gen([
      {
        event: "handoff",
        data: {
          assistantContent: [{ type: "tool_use", id: "t", name: "noop", input: {} }],
          serverToolResults: [],
          clientToolCalls: [{ id: "t", name: "noop", input: {} }],
        },
      },
    ]);
    const result = await runAssistantTurn([{ role: "user", content: "loop" }], {
      ...baseDeps,
      registry,
      maxRoundTrips: 2,
      stream: stream as any,
    });
    expect(result.error?.message).toMatch(/step limit/i);
  });

  it("surfaces a thrown stream error (e.g. 429) as a turn error with retryAfter", async () => {
    class RateLimitError extends Error {
      retryAfter?: number;
      constructor(m: string, r?: number) {
        super(m);
        this.retryAfter = r;
      }
    }
    const stream = () =>
      // eslint-disable-next-line require-yield -- intentionally throws before ever yielding
      (async function* () {
        throw new RateLimitError("Rate limit exceeded", 30);
      })();
    const result = await runAssistantTurn([{ role: "user", content: "hi" }], {
      ...baseDeps,
      stream: stream as any,
    });
    expect(result.error?.message).toMatch(/rate limit/i);
    expect(result.error?.retryAfter).toBe(30);
  });
});
