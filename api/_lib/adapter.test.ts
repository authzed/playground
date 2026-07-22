import { describe, expect, it, vi } from "vitest";

import { handleAiRequest } from "../ai.js";

const baseArgs = {
  ip: "1.2.3.4",
  env: { OPENROUTER_API_KEY: "sk-test", AI_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  client: {
    stream: () => ({
      on: () => {},
      finalMessage: () =>
        Promise.resolve({
          message: { role: "assistant" as const, content: "hi" },
          finish_reason: "stop",
        }),
    }),
  },
};

const validBody = {
  messages: [{ role: "user", content: "hi" }],
  state: { schema: "", relationships: "", assertions: "", expected: "" },
  tools: [],
};

function fakeSink() {
  const events: { event: string; data: unknown }[] = [];
  return {
    send: (event: string, data: unknown) => events.push({ event, data }),
    end: vi.fn(),
    events,
  };
}

describe("handleAiRequest", () => {
  it("rejects non-POST", async () => {
    const respondError = vi.fn();
    const sink = fakeSink();
    await handleAiRequest({ ...baseArgs, method: "GET", body: validBody, sink, respondError });
    expect(respondError).toHaveBeenCalledWith(405, expect.anything());
  });

  it("returns 503 when AI is disabled", async () => {
    const respondError = vi.fn();
    const sink = fakeSink();
    await handleAiRequest({
      ...baseArgs,
      env: { ...baseArgs.env, AI_ENABLED: "false" },
      method: "POST",
      body: validBody,
      sink,
      respondError,
    });
    expect(respondError).toHaveBeenCalledWith(503, expect.anything());
  });

  it("returns 400 on an invalid body", async () => {
    const respondError = vi.fn();
    const sink = fakeSink();
    await handleAiRequest({ ...baseArgs, method: "POST", body: { bad: true }, sink, respondError });
    expect(respondError).toHaveBeenCalledWith(400, expect.anything());
  });

  it("streams a turn for a valid request", async () => {
    const respondError = vi.fn();
    const sink = fakeSink();
    await handleAiRequest({ ...baseArgs, method: "POST", body: validBody, sink, respondError });
    expect(respondError).not.toHaveBeenCalled();
    expect(sink.events.find((e) => e.event === "done")).toBeDefined();
  });
});
