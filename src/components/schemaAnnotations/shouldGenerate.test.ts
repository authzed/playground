import { describe, expect, it } from "vitest";

import { shouldGenerate } from "./toggleLogic";

describe("shouldGenerate", () => {
  it("generates when turning on with no annotations", () => {
    expect(shouldGenerate("compact", 0)).toBe(true);
    expect(shouldGenerate("full", 0)).toBe(true);
  });
  it("does not generate when annotations already exist", () => {
    expect(shouldGenerate("full", 3)).toBe(false);
  });
  it("never generates when turning off", () => {
    expect(shouldGenerate("off", 0)).toBe(false);
  });
});
