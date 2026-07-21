import { describe, expect, it } from "vitest";
import z from "zod";

import { AiRequestSchema } from "./schema.js";

const valid = {
  messages: [{ role: "user", content: "add a viewer role" }],
  state: { schema: "definition user {}", relationships: "", assertions: "", expected: "" },
  tools: [{ name: "run_check", description: "run a check", input_schema: { type: "object" } }],
};

describe("AiRequestSchema", () => {
  it("accepts a well-formed request", () => {
    const { error } = z.safeParse(AiRequestSchema, valid);
    expect(error).toBeUndefined();
  });

  it("rejects a request with no messages", () => {
    const { error } = z.safeParse(AiRequestSchema, { ...valid, messages: [] });
    expect(error).toBeDefined();
  });

  it("rejects a request with too many tools", () => {
    const tools = Array.from({ length: 65 }, (_, i) => ({
      name: `t${i}`,
      description: "d",
      input_schema: { type: "object" },
    }));
    const { error } = z.safeParse(AiRequestSchema, { ...valid, tools });
    expect(error).toBeDefined();
  });

  it("rejects an oversized state document", () => {
    const { error } = z.safeParse(AiRequestSchema, {
      ...valid,
      state: { ...valid.state, schema: "x".repeat(200_001) },
    });
    expect(error).toBeDefined();
  });

  it("accepts an assistant message with tool_calls and null content", () => {
    const { error } = z.safeParse(AiRequestSchema, {
      ...valid,
      messages: [
        ...valid.messages,
        {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "t1", type: "function", function: { name: "run_check", arguments: "{}" } },
          ],
        },
      ],
    });
    expect(error).toBeUndefined();
  });

  it("accepts a tool-role message", () => {
    const { error } = z.safeParse(AiRequestSchema, {
      ...valid,
      messages: [
        ...valid.messages,
        { role: "tool", tool_call_id: "t1", content: "{\"ok\":true}" },
      ],
    });
    expect(error).toBeUndefined();
  });

  it("rejects a message with an unknown role", () => {
    const { error } = z.safeParse(AiRequestSchema, {
      ...valid,
      messages: [{ role: "system", content: "nope" }],
    });
    expect(error).toBeDefined();
  });
});
