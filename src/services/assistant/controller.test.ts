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
  onToolStart: vi.fn(),
  onToolEnd: vi.fn(),
  onStatus: vi.fn(),
  onArtifact: vi.fn(),
};

describe("runAssistantTurn", () => {
  it("streams text and finishes on done", async () => {
    const onText = vi.fn();
    const stream = gen([
      { event: "text", data: { delta: "hi" } },
      {
        event: "done",
        data: { assistantMessage: { role: "assistant", content: "hi" }, finish_reason: "stop" },
      },
    ]);
    const start: ChatMessage[] = [{ role: "user", content: "yo" }];
    const result = await runAssistantTurn(start, { ...baseDeps, onText, stream: stream as any });
    expect(onText).toHaveBeenCalledWith("hi");
    expect(result.messages[result.messages.length - 1]).toEqual({
      role: "assistant",
      content: "hi",
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
              assistantMessage: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "t1",
                    type: "function",
                    function: { name: "run_check", arguments: '{"resource":"doc:x"}' },
                  },
                ],
              },
              serverToolResults: [],
              clientToolCalls: [{ id: "t1", name: "run_check", input: { resource: "doc:x" } }],
            },
          },
        ],
        [
          {
            event: "done",
            data: {
              assistantMessage: { role: "assistant", content: "done" },
              finish_reason: "stop",
            },
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
    // messages: user, assistant(tool_calls), tool(result), assistant(text)
    expect(result.messages).toHaveLength(4);
    expect(result.messages[2]).toMatchObject({ role: "tool", tool_call_id: "t1" });
  });

  it("separates text from different round trips with a paragraph break", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "noop",
      description: "d",
      parameters: z.object({}),
      execute: () => ({}),
    });
    const onText = vi.fn();
    let _call = 0;
    const frames: SseEvent[][] = [
      [
        { event: "text", data: { delta: "First block." } },
        {
          event: "handoff",
          data: {
            assistantMessage: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "t", type: "function", function: { name: "noop", arguments: "{}" } },
              ],
            },
            serverToolResults: [],
            clientToolCalls: [{ id: "t", name: "noop", input: {} }],
          },
        },
      ],
      [
        { event: "text", data: { delta: "Second block." } },
        {
          event: "done",
          data: {
            assistantMessage: { role: "assistant", content: "Second block." },
            finish_reason: "stop",
          },
        },
      ],
    ];
    const stream = () =>
      (async function* () {
        for (const e of frames[_call++]) yield e;
      })();

    await runAssistantTurn([{ role: "user", content: "go" }], {
      ...baseDeps,
      registry,
      onText,
      stream: stream as any,
    });

    // First trip's text is emitted as-is; the second trip's first text is prefixed
    // with a paragraph break so the two blocks don't run together.
    expect(onText).toHaveBeenNthCalledWith(1, "First block.");
    expect(onText).toHaveBeenNthCalledWith(2, "\n\nSecond block.");
  });

  it("does not insert a separator between deltas within one round trip", async () => {
    const onText = vi.fn();
    const stream = gen([
      { event: "text", data: { delta: "one " } },
      { event: "text", data: { delta: "two" } },
      {
        event: "done",
        data: {
          assistantMessage: { role: "assistant", content: "one two" },
          finish_reason: "stop",
        },
      },
    ]);
    await runAssistantTurn([{ role: "user", content: "yo" }], {
      ...baseDeps,
      onText,
      stream: stream as any,
    });
    expect(onText).toHaveBeenNthCalledWith(1, "one ");
    expect(onText).toHaveBeenNthCalledWith(2, "two");
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
          assistantMessage: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "t", type: "function", function: { name: "noop", arguments: "{}" } },
            ],
          },
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

  it("prefixes a failing tool result with 'Error:' so the model can't miss it", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "run_validation",
      description: "d",
      parameters: z.object({}),
      execute: () => ({ passed: false, failures: ["missing relation"] }),
      isError: (result) => (result as { passed: boolean }).passed === false,
    });

    const stream = gen([
      {
        event: "handoff",
        data: {
          assistantMessage: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "t1", type: "function", function: { name: "run_validation", arguments: "{}" } },
            ],
          },
          serverToolResults: [],
          clientToolCalls: [{ id: "t1", name: "run_validation", input: {} }],
        },
      },
    ]);

    const result = await runAssistantTurn([{ role: "user", content: "validate" }], {
      ...baseDeps,
      registry,
      maxRoundTrips: 1,
      stream: stream as any,
    });

    const toolMessage = result.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "t1",
    );
    expect(toolMessage?.content).toMatch(/^Error:/);
    expect(toolMessage?.content).toContain('"passed":false');
  });

  it("reports tool activity for a malformed client tool call without executing anything", async () => {
    const onToolStart = vi.fn();
    const onToolEnd = vi.fn();
    const registry = new ToolRegistry();
    const execute = vi.fn();
    registry.register({
      name: "run_check",
      description: "d",
      parameters: z.object({ resource: z.string() }),
      execute,
    });

    let _call = 0;
    const frames: SseEvent[][] = [
      [
        {
          event: "handoff",
          data: {
            assistantMessage: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "c1",
                  type: "function",
                  function: { name: "run_check", arguments: "{not json" },
                },
              ],
            },
            serverToolResults: [
              {
                role: "tool",
                tool_call_id: "c1",
                content:
                  'Malformed arguments for tool "run_check": Unexpected end of JSON input. The call was not executed.',
              },
            ],
            clientToolCalls: [],
            malformedClientToolCalls: [
              { id: "c1", name: "run_check", error: "Unexpected end of JSON input" },
            ],
          },
        },
      ],
      [
        {
          event: "done",
          data: { assistantMessage: { role: "assistant", content: "done" }, finish_reason: "stop" },
        },
      ],
    ];
    const stream = () =>
      (async function* () {
        for (const e of frames[_call++]) yield e;
      })();

    await runAssistantTurn([{ role: "user", content: "check it" }], {
      ...baseDeps,
      registry,
      onToolStart,
      onToolEnd,
      stream: stream as any,
    });

    expect(execute).not.toHaveBeenCalled();
    // Malformed calls still get a guaranteed start/end pair, same as executed ones.
    expect(onToolStart).toHaveBeenCalledWith({ id: "c1", name: "run_check" });
    expect(onToolEnd).toHaveBeenCalledWith({
      id: "c1",
      name: "run_check",
      summary: "malformed arguments",
      ok: false,
    });
  });

  it("brackets a client tool with a start and an end sharing the call id", async () => {
    const onToolStart = vi.fn();
    const onToolEnd = vi.fn();
    const registry = new ToolRegistry();
    registry.register({
      name: "run_check",
      description: "d",
      parameters: z.object({ resource: z.string() }),
      execute: () => ({ ok: true }),
      summarize: () => "allowed",
    });

    const stream = gen([
      {
        event: "handoff",
        data: {
          assistantMessage: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "t1",
                type: "function",
                function: { name: "run_check", arguments: '{"resource":"doc:x"}' },
              },
            ],
          },
          serverToolResults: [],
          clientToolCalls: [{ id: "t1", name: "run_check", input: { resource: "doc:x" } }],
        },
      },
    ]);

    await runAssistantTurn([{ role: "user", content: "check" }], {
      ...baseDeps,
      registry,
      maxRoundTrips: 1,
      onToolStart,
      onToolEnd,
      stream: stream as any,
    });

    expect(onToolStart).toHaveBeenCalledWith({ id: "t1", name: "run_check" });
    expect(onToolEnd).toHaveBeenCalledWith({
      id: "t1",
      name: "run_check",
      summary: "allowed",
      ok: true,
    });
  });

  it("yields to the event loop between starting a tool and executing it", async () => {
    // Every client tool is synchronous. Without a yield, onToolStart and
    // tool.execute run in one macrotask, so React batches the start and end
    // store writes and the in-progress chip never paints. Assert a macrotask
    // boundary actually separates them.
    const events: string[] = [];
    const registry = new ToolRegistry();
    registry.register({
      name: "run_check",
      description: "d",
      parameters: z.object({}),
      execute: () => {
        events.push("execute");
        return { ok: true };
      },
    });

    const stream = gen([
      {
        event: "handoff",
        data: {
          assistantMessage: { role: "assistant", content: null },
          serverToolResults: [],
          clientToolCalls: [{ id: "t1", name: "run_check", input: {} }],
        },
      },
    ]);

    await runAssistantTurn([{ role: "user", content: "check" }], {
      ...baseDeps,
      registry,
      maxRoundTrips: 1,
      onToolStart: () => {
        events.push("start");
        // Queued before the controller's own yield, so it must run first — and
        // it can only run at all if the controller gives up the macrotask.
        setTimeout(() => events.push("macrotask"), 0);
      },
      stream: stream as any,
    });

    // Without the yield, execute() runs in the same macrotask as the start
    // callback and this reads ["start", "execute", "macrotask"].
    expect(events).toEqual(["start", "macrotask", "execute"]);
  });

  it("still ends the tool when it is unknown to the registry", async () => {
    const onToolStart = vi.fn();
    const onToolEnd = vi.fn();
    const stream = gen([
      {
        event: "handoff",
        data: {
          assistantMessage: { role: "assistant", content: null },
          serverToolResults: [],
          clientToolCalls: [{ id: "z9", name: "nope", input: {} }],
        },
      },
    ]);

    await runAssistantTurn([{ role: "user", content: "go" }], {
      ...baseDeps,
      maxRoundTrips: 1,
      onToolStart,
      onToolEnd,
      stream: stream as any,
    });

    // A start with no matching end would leave a chip spinning forever.
    expect(onToolStart).toHaveBeenCalledWith({ id: "z9", name: "nope" });
    expect(onToolEnd).toHaveBeenCalledWith({
      id: "z9",
      name: "nope",
      summary: "unknown tool",
      ok: false,
    });
  });

  it("forwards a status event and clears it once text resumes", async () => {
    const onStatus = vi.fn();
    const stream = gen([
      { event: "status", data: { label: "Reading design references" } },
      { event: "text", data: { delta: "ok" } },
      {
        event: "done",
        data: { assistantMessage: { role: "assistant", content: "ok" }, finish_reason: "stop" },
      },
    ]);

    await runAssistantTurn([{ role: "user", content: "hi" }], {
      ...baseDeps,
      onStatus,
      stream: stream as any,
    });

    expect(onStatus).toHaveBeenNthCalledWith(1, "Reading design references");
    expect(onStatus).toHaveBeenNthCalledWith(2, null);
    // A spurious extra clear (e.g. one at loop-end and another in a finally)
    // would slip past the two positional assertions above without this.
    expect(onStatus).toHaveBeenCalledTimes(2);
  });

  it("clears a stuck status label when the stream throws mid-iteration", async () => {
    const onStatus = vi.fn();
    class NetworkError extends Error {}
    const stream = () =>
      // eslint-disable-next-line require-yield -- intentionally throws after one yield
      (async function* () {
        yield { event: "status", data: { label: "Reading design references" } } as SseEvent;
        throw new NetworkError("connection reset");
      })();

    const result = await runAssistantTurn([{ role: "user", content: "hi" }], {
      ...baseDeps,
      onStatus,
      stream: stream as any,
    });

    // The stream never resumed with text/done, so without a finally the
    // status label set above would be left stuck in the UI forever.
    expect(onStatus).toHaveBeenCalledWith(null);
    expect(onStatus).toHaveBeenCalledTimes(2);
    expect(result.error?.message).toMatch(/connection reset/i);
  });
});
