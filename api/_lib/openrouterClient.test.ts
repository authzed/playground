import { describe, expect, it, vi, type MockInstance } from "vitest";

import {
  accumulateChunk,
  createAccumulator,
  createOpenRouterClient,
  finalizeAccumulator,
  OpenRouterApiError,
} from "./openrouterClient.js";

describe("accumulateChunk / finalizeAccumulator", () => {
  it("accumulates text deltas and returns each chunk's new text", () => {
    const acc = createAccumulator();
    const d1 = accumulateChunk(acc, { choices: [{ delta: { content: "Hel" } }] });
    const d2 = accumulateChunk(acc, { choices: [{ delta: { content: "lo" } }] });
    expect(d1).toBe("Hel");
    expect(d2).toBe("lo");
    expect(finalizeAccumulator(acc).message.content).toBe("Hello");
  });

  it("accumulates a single tool call's fragmented arguments by index", () => {
    const acc = createAccumulator();
    accumulateChunk(acc, {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                type: "function",
                function: { name: "run_check", arguments: "" },
              },
            ],
          },
        },
      ],
    });
    accumulateChunk(acc, {
      choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"re' } }] } }],
    });
    accumulateChunk(acc, {
      choices: [
        { delta: { tool_calls: [{ index: 0, function: { arguments: 'source":"doc:x"}' } }] } },
      ],
    });
    accumulateChunk(acc, { choices: [{ delta: {}, finish_reason: "tool_calls" }] });

    const final = finalizeAccumulator(acc);
    expect(final.finish_reason).toBe("tool_calls");
    expect(final.message.content).toBeNull();
    expect(final.message.tool_calls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: { name: "run_check", arguments: '{"resource":"doc:x"}' },
      },
    ]);
  });

  it("accumulates multiple parallel tool calls by their own index", () => {
    const acc = createAccumulator();
    accumulateChunk(acc, {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_a",
                type: "function",
                function: { name: "a", arguments: "{}" },
              },
              {
                index: 1,
                id: "call_b",
                type: "function",
                function: { name: "b", arguments: "{}" },
              },
            ],
          },
        },
      ],
    });
    const final = finalizeAccumulator(acc);
    expect(final.message.tool_calls?.map((c) => c.id)).toEqual(["call_a", "call_b"]);
  });

  it("throws OpenRouterApiError when a chunk carries an inline error", () => {
    const acc = createAccumulator();
    expect(() =>
      accumulateChunk(acc, { error: { message: "provider overloaded", code: 503 } }),
    ).toThrow(OpenRouterApiError);
  });

  it("parses a numeric-string error code (docs are inconsistent on the type)", () => {
    const acc = createAccumulator();
    try {
      accumulateChunk(acc, { error: { message: "rate limited", code: "429" } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(OpenRouterApiError);
      expect((err as OpenRouterApiError).status).toBe(429);
    }
  });

  it("falls back to a generic status for a non-numeric string error code", () => {
    const acc = createAccumulator();
    try {
      accumulateChunk(acc, { error: { message: "provider disconnected", code: "server_error" } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(OpenRouterApiError);
      expect((err as OpenRouterApiError).status).toBe(500);
    }
  });

  it("treats an empty error code string as non-numeric, not zero", () => {
    const acc = createAccumulator();
    try {
      accumulateChunk(acc, { error: { message: "upstream reset", code: "" } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(OpenRouterApiError);
      expect((err as OpenRouterApiError).status).toBe(500);
      expect((err as OpenRouterApiError).message).toContain("(code: )");
    }
  });

  it("defaults finish_reason to stop when none was ever seen", () => {
    const acc = createAccumulator();
    accumulateChunk(acc, { choices: [{ delta: { content: "hi" } }] });
    expect(finalizeAccumulator(acc).finish_reason).toBe("stop");
  });
});

describe("createOpenRouterClient", () => {
  function sseResponse(lines: string[], status = 200) {
    const body = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const line of lines) controller.enqueue(encoder.encode(line));
        controller.close();
      },
    });
    return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
  }

  it("streams text deltas and resolves the final message", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      );
    const client = createOpenRouterClient("sk-test", fetchImpl);
    const stream = client.stream({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
      tools: [],
    });
    const deltas: string[] = [];
    stream.on("text", (d) => deltas.push(d));
    const final = await stream.finalMessage();

    expect(deltas).toEqual(["Hi"]);
    expect(final.message.content).toBe("Hi");
    expect(final.finish_reason).toBe("stop");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer sk-test",
        }),
      }),
    );
    const [, requestInit] = fetchImpl.mock.calls[0];
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      stream: true,
    });
  });

  it("throws OpenRouterApiError with status/headers on a non-OK response", async () => {
    // 429 is a retryable status, so this exercises fetchWithRetry too — a
    // fresh Response per call, since a real fetch() never hands back the
    // same Response instance (with the same already-drained body) twice.
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
          status: 429,
          headers: { "retry-after": "12" },
        }),
      ),
    );
    const client = createOpenRouterClient("sk-test", fetchImpl);
    const stream = client.stream({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [],
      tools: [],
    });

    await expect(stream.finalMessage()).rejects.toMatchObject({
      status: 429,
      message: "Rate limit exceeded",
    });
  });

  it("throws OpenRouterApiError on a mid-stream inline error chunk", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        sseResponse(['data: {"error":{"message":"provider overloaded","code":503}}\n\n']),
      );
    const client = createOpenRouterClient("sk-test", fetchImpl);
    const stream = client.stream({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [],
      tools: [],
    });
    await expect(stream.finalMessage()).rejects.toMatchObject({ status: 503 });
  });

  it("handles OpenRouter's documented mid-stream error chunk verbatim", async () => {
    // Pinned to the exact example from
    // https://openrouter.ai/docs/api_reference/streaming#handling-errors-during-streaming
    // — once tokens have streamed, HTTP 200 is already committed, so the
    // error arrives as a string type code, not a numeric HTTP status.
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"id":"cmpl-abc123","object":"chat.completion.chunk","created":1234567890,"model":"openai/gpt-4o","provider":"openai","error":{"code":"server_error","message":"Provider disconnected unexpectedly"},"choices":[{"index":0,"delta":{"content":""},"finish_reason":"error"}]}\n\n',
        ]),
      );
    const client = createOpenRouterClient("sk-test", fetchImpl);
    const stream = client.stream({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [],
      tools: [],
    });
    await expect(stream.finalMessage()).rejects.toMatchObject({
      status: 500,
      message: "Provider disconnected unexpectedly (code: server_error)",
    });
  });

  it("retries a transient network error and succeeds on a later attempt", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl = vi.fn().mockImplementation(() => {
        calls++;
        if (calls < 3) return Promise.reject(new Error("network blip"));
        return Promise.resolve(
          sseResponse([
            'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
            "data: [DONE]\n\n",
          ]),
        );
      });
      const client = createOpenRouterClient("sk-test", fetchImpl);
      const stream = client.stream({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 100,
        messages: [],
        tools: [],
      });
      const finalPromise = stream.finalMessage();
      await vi.runAllTimersAsync();
      const final = await finalPromise;

      expect(calls).toBe(3);
      expect(final.message.content).toBe("Hi");
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a retryable HTTP status and succeeds on a later attempt", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl = vi.fn().mockImplementation(() => {
        calls++;
        if (calls < 2) return Promise.resolve(new Response("", { status: 503 }));
        return Promise.resolve(
          sseResponse([
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
            "data: [DONE]\n\n",
          ]),
        );
      });
      const client = createOpenRouterClient("sk-test", fetchImpl);
      const stream = client.stream({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 100,
        messages: [],
        tools: [],
      });
      const finalPromise = stream.finalMessage();
      await vi.runAllTimersAsync();
      await finalPromise;

      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a discarded retryable response's body before retrying", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      let cancelSpy: MockInstance<(reason?: unknown) => Promise<void>> | undefined;
      const fetchImpl = vi.fn().mockImplementation(() => {
        calls++;
        if (calls === 1) {
          const body = new ReadableStream({
            start(controller) {
              controller.close();
            },
          });
          cancelSpy = vi.spyOn(body, "cancel");
          return Promise.resolve(new Response(body, { status: 503 }));
        }
        return Promise.resolve(
          sseResponse([
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
            "data: [DONE]\n\n",
          ]),
        );
      });
      const client = createOpenRouterClient("sk-test", fetchImpl);
      const stream = client.stream({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 100,
        messages: [],
        tools: [],
      });
      const finalPromise = stream.finalMessage();
      await vi.runAllTimersAsync();
      await finalPromise;

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry a non-retryable HTTP status", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
      );
    const client = createOpenRouterClient("sk-test", fetchImpl);
    const stream = client.stream({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 100,
      messages: [],
      tools: [],
    });
    await expect(stream.finalMessage()).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
