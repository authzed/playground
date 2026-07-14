import { describe, expect, it } from "vitest";

import { SERVER_TOOLS, SERVER_TOOL_NAMES } from "./serverTools";

const readSkill = SERVER_TOOLS.find((t) => t.name === "read_skill_reference")!;

describe("read_skill_reference", () => {
  it("is registered", () => {
    expect(readSkill).toBeDefined();
    expect(SERVER_TOOL_NAMES.has("read_skill_reference")).toBe(true);
  });

  it("returns content for a whitelisted reference", () => {
    const out = readSkill.execute({ name: "patterns" });
    expect(out.length).toBeGreaterThan(50);
  });

  it("rejects an unknown reference name", () => {
    const out = readSkill.execute({ name: "../secrets" });
    expect(out.toLowerCase()).toContain("unknown");
  });
});
