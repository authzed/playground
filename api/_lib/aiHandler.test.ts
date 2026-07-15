import { describe, expect, it, vi } from "vitest";

import { type AnthropicLike, type FinalMessage, runAiTurn } from "./aiHandler";

function fakeAnthropic(finals: FinalMessage[], textByCall: string[][] = []): AnthropicLike {
  let call = 0;
  return {
    stream() {
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
const deps = { model: "claude-sonnet-5", maxTokens: 1024, maxRoundTrips: 10 };

describe("runAiTurn", () => {
  it("streams text and emits done when the model uses no tools", async () => {
    const { sink, events } = collectingSink();
    const anthropic = fakeAnthropic(
      [{ content: [{ type: "text", text: "hello" }], stop_reason: "end_turn" }],
      [["hel", "lo"]],
    );
    await runAiTurn(req, { ...deps, anthropic }, sink);

    expect(events.filter((e) => e.event === "text").map((e) => e.data.delta)).toEqual([
      "hel",
      "lo",
    ]);
    const done = events.find((e) => e.event === "done");
    expect(done?.data.stop_reason).toBe("end_turn");
    expect(sink.end).toHaveBeenCalledOnce();
  });

  it("hands off client tool calls without finishing the turn", async () => {
    const { sink, events } = collectingSink();
    const anthropic = fakeAnthropic([
      {
        content: [{ type: "tool_use", id: "t1", name: "run_check", input: { resource: "doc:x" } }],
        stop_reason: "tool_use",
      },
    ]);
    await runAiTurn(req, { ...deps, anthropic }, sink);

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
    const anthropic = fakeAnthropic([
      {
        content: [
          { type: "tool_use", id: "s1", name: "read_skill_reference", input: { name: "patterns" } },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "done" }], stop_reason: "end_turn" },
    ]);
    await runAiTurn(req, { ...deps, anthropic }, sink);

    expect(events.find((e) => e.event === "handoff")).toBeUndefined();
    expect(events.find((e) => e.event === "done")).toBeDefined();
  });

  it("separates text between server-tool round-trips with a paragraph break", async () => {
    const { sink, events } = collectingSink();
    const anthropic = fakeAnthropic(
      [
        {
          content: [
            { type: "text", text: "Let me check the docs." },
            {
              type: "tool_use",
              id: "s1",
              name: "read_skill_reference",
              input: { name: "patterns" },
            },
          ],
          stop_reason: "tool_use",
        },
        { content: [{ type: "text", text: "Based on the reference." }], stop_reason: "end_turn" },
      ],
      [["Let me check the docs."], ["Based on the reference."]],
    );
    await runAiTurn(req, { ...deps, anthropic }, sink);

    // The second trip's first text is prefixed so it doesn't run into the first.
    expect(events.filter((e) => e.event === "text").map((e) => e.data.delta)).toEqual([
      "Let me check the docs.",
      "\n\nBased on the reference.",
    ]);
  });

  it("returns server results alongside pending client calls for a mixed message", async () => {
    const { sink, events } = collectingSink();
    const anthropic = fakeAnthropic([
      {
        content: [
          { type: "tool_use", id: "s1", name: "read_skill_reference", input: { name: "patterns" } },
          { type: "tool_use", id: "c1", name: "run_check", input: {} },
        ],
        stop_reason: "tool_use",
      },
    ]);
    await runAiTurn(req, { ...deps, anthropic }, sink);

    const handoff = events.find((e) => e.event === "handoff")!;
    expect(handoff.data.clientToolCalls.map((c: any) => c.id)).toEqual(["c1"]);
    expect(handoff.data.serverToolResults.map((r: any) => r.tool_use_id)).toEqual(["s1"]);
  });

  it("emits a step_limit error when round trips are exhausted", async () => {
    const { sink, events } = collectingSink();
    const serverOnly: FinalMessage = {
      content: [
        { type: "tool_use", id: "s", name: "read_skill_reference", input: { name: "patterns" } },
      ],
      stop_reason: "tool_use",
    };
    const anthropic = fakeAnthropic(Array.from({ length: 5 }, () => serverOnly));
    await runAiTurn(req, { ...deps, anthropic, maxRoundTrips: 2 }, sink);

    expect(events.find((e) => e.event === "error")?.data.code).toBe("step_limit");
  });
});
