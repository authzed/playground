import { describe, expect, it } from "vitest";

import { RateLimitError, streamAssistant } from "./streamClient";

function sseResponse(body: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const req = {
  endpoint: "/api/ai",
  messages: [{ role: "user" as const, content: "hi" }],
  state: { schema: "", relationships: "", assertions: "", expected: "" },
  tools: [],
};

describe("streamAssistant", () => {
  it("parses text and done events across chunks", async () => {
    const body =
      'event: text\ndata: {"delta":"he"}\n\n' +
      'event: text\ndata: {"delta":"llo"}\n\n' +
      'event: done\ndata: {"assistantContent":[],"stop_reason":"end_turn"}\n\n';
    const fetchImpl = async () => sseResponse(body);
    const events = [];
    for await (const e of streamAssistant(req, fetchImpl as unknown as typeof fetch))
      events.push(e);
    expect(events.map((e) => e.event)).toEqual(["text", "text", "done"]);
    expect((events[0] as any).data.delta).toBe("he");
  });

  it("throws RateLimitError on 429", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter: 30 }), {
        status: 429,
      });
    await expect(async () => {
      for await (const _ of streamAssistant(req, fetchImpl as unknown as typeof fetch)) void _;
    }).rejects.toBeInstanceOf(RateLimitError);
  });

  it("parses events split across multiple read() chunks", async () => {
    const full =
      'event: text\ndata: {"delta":"hello"}\n\n' +
      'event: done\ndata: {"assistantContent":[],"stop_reason":"end_turn"}\n\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(full.slice(0, 20))); // split mid-frame
        controller.enqueue(enc.encode(full.slice(20)));
        controller.close();
      },
    });
    const fetchImpl = async () =>
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    const events = [];
    for await (const e of streamAssistant(req, fetchImpl as unknown as typeof fetch))
      events.push(e);
    expect(events.map((e) => e.event)).toEqual(["text", "done"]);
  });

  it("emits a final frame that has no trailing blank line", async () => {
    const body = 'event: done\ndata: {"assistantContent":[],"stop_reason":"end_turn"}';
    const fetchImpl = async () => sseResponse(body);
    const events = [];
    for await (const e of streamAssistant(req, fetchImpl as unknown as typeof fetch))
      events.push(e);
    expect(events.map((e) => e.event)).toEqual(["done"]);
  });

  it("falls back to friendly copy when a non-200 carries no JSON body", async () => {
    // A CDN/proxy 503 never reaches our route, so there is no server-composed
    // `error` field to surface.
    const fetchImpl = async () => new Response("<html>gateway</html>", { status: 503 });
    await expect(async () => {
      for await (const _ of streamAssistant(req, fetchImpl as unknown as typeof fetch)) void _;
    }).rejects.toThrow(/temporarily unavailable/i);
  });

  it("prefers the server-composed message over the fallback", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ code: "disabled", error: "The AI assistant is turned off." }), {
        status: 503,
      });
    await expect(async () => {
      for await (const _ of streamAssistant(req, fetchImpl as unknown as typeof fetch)) void _;
    }).rejects.toThrow(/turned off/i);
  });
});
