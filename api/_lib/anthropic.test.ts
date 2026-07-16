import { describe, expect, it } from "vitest";

import { ToolCollisionError, buildSystemBlocks, buildToolDefs } from "./anthropic.js";

describe("buildSystemBlocks", () => {
  it("puts the cached skill overview first and the live state after", () => {
    const blocks = buildSystemBlocks({
      schema: "definition user {}",
      relationships: "",
      assertions: "",
      expected: "",
    });
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[0].text).toContain("SpiceDB");
    const stateBlock = blocks[blocks.length - 1];
    expect(stateBlock.cache_control).toBeUndefined();
    expect(stateBlock.text).toContain("definition user {}");
  });
});

describe("buildToolDefs", () => {
  it("merges client tools with server tools", () => {
    const defs = buildToolDefs([
      { name: "run_check", description: "d", input_schema: { type: "object" } },
    ]);
    const names = defs.map((d) => d.name);
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
