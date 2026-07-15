import { describe, expect, it, vi } from "vitest";

import { createWritableSseSink, formatSseEvent } from "./sse";

describe("formatSseEvent", () => {
  it("formats an event with JSON data and a blank-line terminator", () => {
    expect(formatSseEvent("text", { delta: "hi" })).toBe('event: text\ndata: {"delta":"hi"}\n\n');
  });
});

describe("createWritableSseSink", () => {
  it("writes formatted events and ends once", () => {
    const write = vi.fn();
    const end = vi.fn();
    const sink = createWritableSseSink(write, end);

    sink.send("done", { stop_reason: "end_turn" });
    sink.end();

    expect(write).toHaveBeenCalledWith('event: done\ndata: {"stop_reason":"end_turn"}\n\n');
    expect(end).toHaveBeenCalledOnce();
  });

  it("does not write after end", () => {
    const write = vi.fn();
    const end = vi.fn();
    const sink = createWritableSseSink(write, end);

    sink.end();
    sink.send("text", { delta: "x" });

    expect(write).not.toHaveBeenCalled();
  });

  it("end() is idempotent", () => {
    const write = vi.fn();
    const end = vi.fn();
    const sink = createWritableSseSink(write, end);

    sink.end();
    sink.end();

    expect(end).toHaveBeenCalledOnce();
  });
});
