import { describe, expect, it, vi } from "vitest";

import { bootstrapAiRoute, type AiRouteResponse } from "./aiRoute.js";

function fakeResponse(headersSent = false) {
  const headers: Record<string, string> = {};
  const write = vi.fn();
  const end = vi.fn();
  const setHeader = vi.fn((name: string, value: string) => {
    headers[name] = value;
  });
  const res: AiRouteResponse = {
    headersSent,
    statusCode: 200,
    setHeader,
    write,
    end,
  };
  return { res, headers, write, end, setHeader };
}

describe("bootstrapAiRoute", () => {
  it("sets the SSE response headers", () => {
    const { res, headers } = fakeResponse();
    bootstrapAiRoute(res);
    expect(headers["Content-Type"]).toBe("text/event-stream");
    expect(headers["Cache-Control"]).toBe("no-cache, no-transform");
    expect(headers["Connection"]).toBe("keep-alive");
    expect(headers["X-Accel-Buffering"]).toBe("no");
  });

  it("routes sink writes/ends through the response", () => {
    const { res, write, end } = fakeResponse();
    const { sink } = bootstrapAiRoute(res);
    sink.send("text", { delta: "hi" });
    sink.end();
    expect(write).toHaveBeenCalledWith('event: text\ndata: {"delta":"hi"}\n\n');
    expect(end).toHaveBeenCalled();
  });

  it("respondError sends a plain JSON error before headers are sent", () => {
    const { res, headers, end } = fakeResponse();
    const { respondError } = bootstrapAiRoute(res);
    respondError(429, { error: "Rate limit exceeded", retryAfter: 5 });
    expect(res.statusCode).toBe(429);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Rate limit exceeded", retryAfter: 5 }),
    );
  });

  it("respondError falls back to an SSE error event once headers are sent", () => {
    const { res, write } = fakeResponse(true);
    const { respondError } = bootstrapAiRoute(res);
    respondError(500, { error: "boom", retryAfter: 3 });
    expect(write).toHaveBeenCalledWith('event: error\ndata: {"message":"boom","retryAfter":3}\n\n');
  });

  it("returns an Anthropic-like client", () => {
    const { res } = fakeResponse();
    const { anthropic } = bootstrapAiRoute(res);
    expect(typeof anthropic.stream).toBe("function");
  });
});
