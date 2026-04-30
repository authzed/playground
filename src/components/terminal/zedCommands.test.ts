import { describe, expect, it } from "vitest";

import { getCompletions } from "./zedCommands";

describe("getCompletions", () => {
  it("returns top-level commands when input is empty", () => {
    const c = getCompletions("");
    expect(c.map((n) => n.name)).toEqual(
      expect.arrayContaining(["schema", "permission", "relationship"]),
    );
  });

  it("returns subcommands of zed schema", () => {
    const c = getCompletions("zed schema ");
    expect(c.map((n) => n.name)).toEqual(expect.arrayContaining(["read", "write"]));
  });

  it("filters by prefix on the last token", () => {
    const c = getCompletions("zed schema r");
    expect(c.map((n) => n.name)).toEqual(["read"]);
  });

  it("returns empty for unknown commands", () => {
    expect(getCompletions("zed unknown")).toEqual([]);
  });
});
