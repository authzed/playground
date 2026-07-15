import { describe, expect, it } from "vitest";

import { docsEqual, summarizeChange, trimToCap } from "./historyLogic";
import type { HistoryDocs, Revision } from "./types";

const base: HistoryDocs = { schema: "s", relationships: "r", assertions: "a", expected: "e" };

describe("docsEqual", () => {
  it("is true for identical docs", () => {
    expect(docsEqual(base, { ...base })).toBe(true);
  });
  it("is false when relationships, assertions, or expected differ", () => {
    expect(docsEqual(base, { ...base, relationships: "r2" })).toBe(false);
    expect(docsEqual(base, { ...base, assertions: "a2" })).toBe(false);
    expect(docsEqual(base, { ...base, expected: "e2" })).toBe(false);
  });
});

describe("trimToCap", () => {
  it("keeps only the newest `cap` revisions", () => {
    const revs: Revision[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      ts: i,
      source: "manual",
      docs: base,
    }));
    const trimmed = trimToCap(revs, 3);
    expect(trimmed.map((r) => r.id)).toEqual(["2", "3", "4"]);
  });
});

describe("summarizeChange", () => {
  it("lists which docs changed", () => {
    expect(summarizeChange(base, { ...base, schema: "x", assertions: "y" })).toBe(
      "schema, assertions",
    );
  });
  it("says 'initial' when there is no previous", () => {
    expect(summarizeChange(undefined, base)).toBe("initial");
  });
  it("returns 'no change' when prev and next are identical", () => {
    expect(summarizeChange(base, { ...base })).toBe("no change");
  });
});
