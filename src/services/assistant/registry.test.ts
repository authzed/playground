import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ToolRegistry } from "./registry";
import type { AssistantTool } from "./types";

const tool: AssistantTool = {
  name: "demo",
  description: "a demo tool",
  parameters: z.object({ value: z.string() }),
  execute: (input) => input,
};

describe("ToolRegistry", () => {
  it("registers, gets, and lists tools", () => {
    const r = new ToolRegistry();
    r.register(tool);
    expect(r.get("demo")).toBe(tool);
    expect(r.list().map((t) => t.name)).toEqual(["demo"]);
  });

  it("throws on duplicate registration", () => {
    const r = new ToolRegistry();
    r.register(tool);
    expect(() => r.register(tool)).toThrow(/demo/);
  });

  it("produces Anthropic wire tool defs with an input_schema object", () => {
    const r = new ToolRegistry();
    r.register(tool);
    const wire = r.toWire();
    expect(wire[0].name).toBe("demo");
    expect(wire[0].description).toBe("a demo tool");
    expect(wire[0].input_schema).toMatchObject({ type: "object" });
  });
});
