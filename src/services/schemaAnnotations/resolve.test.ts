import { describe, expect, it } from "vitest";

import {
  computeAnnotationViews,
  hashSymbolSource,
  listSchemaSymbols,
  resolveSymbol,
} from "./resolve";
import type { SchemaAnnotation } from "./types";

const SCHEMA = `definition user {}

definition document {
	relation viewer: user
	permission view = viewer
}

caveat is_tuesday(day string) {
	day == "tuesday"
}`;

describe("resolveSymbol", () => {
  it("resolves a definition to its range and source text", () => {
    const r = resolveSymbol(SCHEMA, "definition", "document");
    expect(r).toBeDefined();
    expect(r!.startLine).toBe(3);
    expect(r!.sourceText).toContain("permission view = viewer");
  });

  it("resolves a permission member by 'def/member' path", () => {
    const r = resolveSymbol(SCHEMA, "permission", "document/view");
    expect(r).toBeDefined();
    expect(r!.startLine).toBe(5);
    expect(r!.sourceText).toContain("permission view");
  });

  it("resolves a caveat", () => {
    const r = resolveSymbol(SCHEMA, "caveat", "is_tuesday");
    expect(r).toBeDefined();
    expect(r!.startLine).toBe(8);
    expect(r!.startColumn).toBe(1);
    expect(r!.sourceText).toContain("day == ");
  });

  it("returns undefined for an unknown symbol", () => {
    expect(resolveSymbol(SCHEMA, "definition", "nope")).toBeUndefined();
    expect(resolveSymbol(SCHEMA, "relation", "document/ghost")).toBeUndefined();
  });

  it("returns undefined when the kind does not match the member", () => {
    // 'view' is a permission, not a relation.
    expect(resolveSymbol(SCHEMA, "relation", "document/view")).toBeUndefined();
  });
});

describe("hashSymbolSource", () => {
  it("is stable and change-sensitive", () => {
    expect(hashSymbolSource("permission view = viewer")).toBe(
      hashSymbolSource("permission view = viewer"),
    );
    expect(hashSymbolSource("permission view = viewer")).not.toBe(
      hashSymbolSource("permission view = viewer + editor"),
    );
  });
});

describe("listSchemaSymbols", () => {
  it("lists definitions, members, and caveats with lines", () => {
    const syms = listSchemaSymbols(SCHEMA);
    const paths = syms.map((s) => s.symbolPath);
    expect(paths).toEqual(
      expect.arrayContaining([
        "user",
        "document",
        "document/viewer",
        "document/view",
        "is_tuesday",
      ]),
    );
    expect(syms.find((s) => s.symbolPath === "is_tuesday")!.startLine).toBe(8);
  });
});

describe("computeAnnotationViews", () => {
  const base: SchemaAnnotation = {
    symbolKind: "permission",
    symbolPath: "document/view",
    shortLabel: "viewers can view",
    explanation: "Anyone who is a viewer can view.",
    sourceHash: hashSymbolSource("permission view = viewer"),
  };

  it("marks a view fresh when the source is unchanged", () => {
    const { views } = computeAnnotationViews(SCHEMA, [base]);
    expect(views).toHaveLength(1);
    expect(views[0].stale).toBe(false);
    expect(views[0].startLine).toBe(5);
  });

  it("marks a view stale when the symbol's source changed", () => {
    const edited = SCHEMA.replace("permission view = viewer", "permission view = viewer + owner");
    const { views } = computeAnnotationViews(edited, [base]);
    expect(views[0].stale).toBe(true);
  });

  it("drops annotations whose symbol no longer resolves", () => {
    const removed = SCHEMA.replace("\tpermission view = viewer\n", "");
    const { views } = computeAnnotationViews(removed, [base]);
    expect(views).toHaveLength(0);
  });

  it("reports schema symbols with no annotation as unexplained", () => {
    const { unexplained } = computeAnnotationViews(SCHEMA, [base]);
    const paths = unexplained.map((u) => u.symbolPath);
    expect(paths).toContain("document");
    expect(paths).not.toContain("document/view");
  });
});
