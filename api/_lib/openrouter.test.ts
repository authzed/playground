import { describe, expect, it } from "vitest";

import { ToolCollisionError, buildSystemMessage, buildToolDefs } from "./openrouter.js";

describe("buildSystemMessage", () => {
  it("is a single system message containing the skill overview and the live state", () => {
    const message = buildSystemMessage({
      schema: "definition user {}",
      relationships: "",
      assertions: "",
      expected: "",
    });
    expect(message.role).toBe("system");
    expect(message.content).toContain("SpiceDB");
    expect(message.content).toContain("definition user {}");
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
