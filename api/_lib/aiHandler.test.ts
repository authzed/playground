import { describe, expect, it, vi } from "vitest";

import { runAiTurn } from "./aiHandler.js";
import type { OpenRouterFinalMessage, OpenRouterLike } from "./openrouterClient.js";

function fakeClient(
  finals: OpenRouterFinalMessage[],
  textByCall: string[][] = [],
): OpenRouterLike & { calls: any[] } {
  let call = 0;
  const calls: any[] = [];
  return {
    calls,
    stream(params) {
      calls.push(params);
      const idx = call++;
      return {
        on(event: "text", cb: (d: string) => void) {
          if (event === "text") for (const t of textByCall[idx] ?? []) cb(t);
        },
        finalMessage: () => Promise.resolve(finals[idx]),
      };
    },
  };
}

function collectingSink() {
  const events: { event: string; data: any }[] = [];
  return {
    sink: {
      send: (event: string, data: unknown) => events.push({ event, data: data as any }),
      end: vi.fn(),
    },
    events,
  };
}

const req = {
  messages: [{ role: "user" as const, content: "hi" }],
  state: { schema: "", relationships: "", assertions: "", expected: "" },
  tools: [{ name: "run_check", description: "d", input_schema: { type: "object" } }],
};
const deps = { model: "anthropic/claude-sonnet-5", maxTokens: 1024, maxRoundTrips: 10 };

describe("runAiTurn", () => {
  it("streams text and emits done when the model uses no tools", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient(
      [{ message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
      [["hel", "lo"]],
    );
    await runAiTurn(req, { ...deps, client }, sink);

    expect(events.filter((e) => e.event === "text").map((e) => e.data.delta)).toEqual([
      "hel",
      "lo",
    ]);
    const done = events.find((e) => e.event === "done");
    expect(done?.data.finish_reason).toBe("stop");
    expect(sink.end).toHaveBeenCalledOnce();
  });

  it("hands off client tool calls without finishing the turn", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
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
        finish_reason: "tool_calls",
      },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    const handoff = events.find((e) => e.event === "handoff");
    expect(handoff).toBeDefined();
    expect(handoff!.data.clientToolCalls).toEqual([
      { id: "t1", name: "run_check", input: { resource: "doc:x" } },
    ]);
    expect(handoff!.data.serverToolResults).toEqual([]);
    expect(events.find((e) => e.event === "done")).toBeUndefined();
  });

  it("executes a server tool inline and continues to a final answer", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "s1",
              type: "function",
              function: { name: "read_skill_reference", arguments: '{"name":"patterns"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
      { message: { role: "assistant", content: "done" }, finish_reason: "stop" },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    expect(events.find((e) => e.event === "handoff")).toBeUndefined();
    expect(events.find((e) => e.event === "done")).toBeDefined();
  });

  it("separates text between server-tool round-trips with a paragraph break", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient(
      [
        {
          message: {
            role: "assistant",
            content: "Let me check the docs.",
            tool_calls: [
              {
                id: "s1",
                type: "function",
                function: { name: "read_skill_reference", arguments: '{"name":"patterns"}' },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
        {
          message: { role: "assistant", content: "Based on the reference." },
          finish_reason: "stop",
        },
      ],
      [["Let me check the docs."], ["Based on the reference."]],
    );
    await runAiTurn(req, { ...deps, client }, sink);

    expect(events.filter((e) => e.event === "text").map((e) => e.data.delta)).toEqual([
      "Let me check the docs.",
      "\n\nBased on the reference.",
    ]);
  });

  it("returns server results alongside pending client calls for a mixed message", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "s1",
              type: "function",
              function: { name: "read_skill_reference", arguments: '{"name":"patterns"}' },
            },
            { id: "c1", type: "function", function: { name: "run_check", arguments: "{}" } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    const handoff = events.find((e) => e.event === "handoff")!;
    expect(handoff.data.clientToolCalls.map((c: any) => c.id)).toEqual(["c1"]);
    expect(handoff.data.serverToolResults.map((r: any) => r.tool_call_id)).toEqual(["s1"]);
  });

  it("emits a step_limit error when round trips are exhausted", async () => {
    const { sink, events } = collectingSink();
    const serverOnly: OpenRouterFinalMessage = {
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "s",
            type: "function",
            function: { name: "read_skill_reference", arguments: '{"name":"patterns"}' },
          },
        ],
      },
      finish_reason: "tool_calls",
    };
    const client = fakeClient(Array.from({ length: 5 }, () => serverOnly));
    await runAiTurn(req, { ...deps, client, maxRoundTrips: 2 }, sink);

    expect(events.find((e) => e.event === "error")?.data.code).toBe("step_limit");
  });

  it("synthesizes a clear failure result for malformed tool-call arguments, without executing the tool", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "s1",
              type: "function",
              function: { name: "read_skill_reference", arguments: '{"name":"patte' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
      { message: { role: "assistant", content: "done" }, finish_reason: "stop" },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    expect(events.find((e) => e.event === "handoff")).toBeUndefined();
    expect(events.find((e) => e.event === "done")).toBeDefined();

    const secondCallMessages = client.calls[1].messages;
    const toolResult = secondCallMessages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "s1",
    );
    expect(toolResult?.content).toMatch(/Malformed arguments for tool "read_skill_reference"/);
    expect(toolResult?.content).toMatch(/not executed/);
  });

  it("includes a malformed-argument failure alongside a valid client tool call in the same handoff", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "bad1",
              type: "function",
              function: { name: "read_skill_reference", arguments: "{not json" },
            },
            { id: "c1", type: "function", function: { name: "run_check", arguments: "{}" } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    const handoff = events.find((e) => e.event === "handoff")!;
    expect(handoff.data.clientToolCalls.map((c: any) => c.id)).toEqual(["c1"]);
    expect(handoff.data.serverToolResults).toHaveLength(1);
    expect(handoff.data.serverToolResults[0]).toMatchObject({ tool_call_id: "bad1" });
    expect((handoff.data.serverToolResults[0] as any).content).toMatch(/Malformed arguments/);
  });

  it("does not cross-contaminate arguments between tool calls that share the same id", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "x",
              type: "function",
              function: { name: "read_skill_reference", arguments: "{not json" },
            },
            {
              id: "x",
              type: "function",
              function: { name: "run_check", arguments: '{"resource":"doc:x"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    const handoff = events.find((e) => e.event === "handoff")!;
    // The malformed read_skill_reference call must not be treated as valid,
    // and the valid run_check call must not be silently dropped or have its
    // arguments merged with the other call sharing the same id.
    expect(handoff.data.clientToolCalls).toEqual([
      { id: "x", name: "run_check", input: { resource: "doc:x" } },
    ]);
    expect(handoff.data.serverToolResults).toHaveLength(1);
    expect((handoff.data.serverToolResults[0] as any).content).toMatch(
      /Malformed arguments for tool "read_skill_reference"/,
    );
  });

  it("hands off (rather than silently continuing) when the only tool call is a malformed client-tool call", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "c1", type: "function", function: { name: "run_check", arguments: "{not json" } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    const handoff = events.find((e) => e.event === "handoff");
    expect(handoff).toBeDefined();
    expect(handoff!.data.clientToolCalls).toEqual([]);
    expect(handoff!.data.malformedClientToolCalls).toEqual([
      { id: "c1", name: "run_check", error: expect.any(String) },
    ]);
    expect(handoff!.data.serverToolResults[0] as any).toMatchObject({ tool_call_id: "c1" });
  });

  it("announces each server tool with a status event before the turn completes", async () => {
    const { sink, events } = collectingSink();
    const client = fakeClient([
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "s1",
              type: "function",
              function: { name: "read_skill_reference", arguments: '{"name":"patterns"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
      { message: { role: "assistant", content: "done" }, finish_reason: "stop" },
    ]);
    await runAiTurn(req, { ...deps, client }, sink);

    // Server tools run entirely server-side, so without this event the client
    // sees no activity at all while they execute.
    const statusIdx = events.findIndex((e) => e.event === "status");
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(events[statusIdx].data.label).toBe("Reading design references");
    expect(statusIdx).toBeLessThan(events.findIndex((e) => e.event === "done"));
  });
});
