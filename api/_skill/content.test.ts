import { describe, expect, it } from "vitest";

import { SKILL_OVERVIEW, SKILL_REFERENCES } from "./content";

describe("vendored skill content", () => {
  it("has a non-empty overview mentioning SpiceDB", () => {
    expect(SKILL_OVERVIEW.length).toBeGreaterThan(100);
    expect(SKILL_OVERVIEW).toContain("SpiceDB");
  });

  it("exposes all four reference sections with content", () => {
    for (const name of ["patterns", "anti-patterns", "schema-evolution", "examples"] as const) {
      expect(SKILL_REFERENCES[name].length).toBeGreaterThan(50);
    }
  });
});
