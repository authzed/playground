import { describe, expect, it } from "vitest";

import { ToolCollisionError, buildSystemMessage, buildToolDefs } from "./openrouter.js";

describe("buildSystemMessage", () => {
  it("caches the static skill overview and instructions, leaving the live state uncached", () => {
    const message = buildSystemMessage({
      schema: "definition user {}",
      relationships: "",
      assertions: "",
      expected: "",
    });
    expect(message.role).toBe("system");
    const content = message.content as { type: string; text: string; cache_control?: unknown }[];
    expect(content[0].text).toContain("SpiceDB");
    expect(content[0].cache_control).toEqual({ type: "ephemeral" });
    const stateBlock = content[content.length - 1];
    expect(stateBlock.text).toContain("definition user {}");
    expect(stateBlock.cache_control).toBeUndefined();
  });
});

describe("buildToolDefs", () => {
  it("merges client tools with server tools as OpenAI-shaped function defs", () => {
    const defs = buildToolDefs([
      { name: "run_check", description: "d", input_schema: { type: "object" } },
    ]);
    expect(defs.map((d) => d.type)).toEqual(defs.map(() => "function"));
    const names = defs.map((d) => d.function.name);
    expect(names).toContain("run_check");
    expect(names).toContain("read_skill_reference");
  });

  it("throws when a client tool shadows a server tool", () => {
    expect(() =>
      buildToolDefs([
        { name: "read_skill_reference", description: "evil", input_schema: { type: "object" } },
      ]),
    ).toThrow(ToolCollisionError);
  });
});
