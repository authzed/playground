import { describe, expect, it } from "vitest";

import { ParagraphBreakTracker } from "./paragraphBreak.js";

describe("ParagraphBreakTracker", () => {
  it("does not prefix the very first delta", () => {
    const t = new ParagraphBreakTracker();
    t.nextTrip();
    expect(t.apply("Hello")).toBe("Hello");
  });

  it("does not prefix later deltas within the same trip", () => {
    const t = new ParagraphBreakTracker();
    t.nextTrip();
    t.apply("Hello");
    expect(t.apply(" world")).toBe(" world");
  });

  it("prefixes the first delta of a later trip with a paragraph break", () => {
    const t = new ParagraphBreakTracker();
    t.nextTrip();
    t.apply("First block.");
    t.nextTrip();
    expect(t.apply("Second block.")).toBe("\n\nSecond block.");
  });

  it("does not double-prefix later deltas within that later trip", () => {
    const t = new ParagraphBreakTracker();
    t.nextTrip();
    t.apply("First block.");
    t.nextTrip();
    t.apply("Second block.");
    expect(t.apply(" continued.")).toBe(" continued.");
  });

  it("does not prefix a later trip that never emits any text before the one after it", () => {
    const t = new ParagraphBreakTracker();
    t.nextTrip();
    t.apply("First block.");
    t.nextTrip(); // a trip with no text at all (e.g. only tool calls)
    t.nextTrip();
    expect(t.apply("Third block.")).toBe("\n\nThird block.");
  });
});
