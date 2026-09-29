import { parse, Resolver } from "@authzed/spicedb-parser-js";
import { describe, expect, it } from "vitest";

import { DataKind } from "./columns";
import {
  caveatTarget,
  relationTarget,
  resolveGridCellTarget,
  tokenAtPosition,
  typeTarget,
} from "./jump-targets";

// Schema written without indentation so every line-start token is at column 1.
const SCHEMA = [
  "definition user {}", // line 1
  "", // line 2
  "definition document {", // line 3
  "relation viewer: user", // line 4
  "permission view = viewer", // line 5
  "}", // line 6
  "", // line 7
  "caveat ip_match(ip string) {", // line 8
  'ip == "1.2.3.4"', // line 9
  "}", // line 10
].join("\n");

function buildResolver(): Resolver {
  const result = parse(SCHEMA);
  if (result.error || !result.schema) {
    throw new Error(`test schema failed to parse: ${result.error?.message}`);
  }
  return new Resolver(result.schema);
}

describe("jump-targets resolution helpers", () => {
  const resolver = buildResolver();

  it("typeTarget resolves a definition to its start line", () => {
    expect(typeTarget(resolver, "user")).toEqual({ line: 1, column: 1 });
    expect(typeTarget(resolver, "document")).toEqual({ line: 3, column: 1 });
  });

  it("typeTarget returns undefined for an unknown type", () => {
    expect(typeTarget(resolver, "nonexistent")).toBeUndefined();
  });

  it("relationTarget resolves a relation and a permission", () => {
    expect(relationTarget(resolver, "document", "viewer")).toEqual({ line: 4, column: 1 });
    expect(relationTarget(resolver, "document", "view")).toEqual({ line: 5, column: 1 });
  });

  it("relationTarget returns undefined for unknown type or relation", () => {
    expect(relationTarget(resolver, "document", "missing")).toBeUndefined();
    expect(relationTarget(resolver, "missing", "viewer")).toBeUndefined();
  });

  it("caveatTarget resolves a caveat definition", () => {
    expect(caveatTarget(resolver, "ip_match")).toEqual({ line: 8, column: 1 });
  });

  it("caveatTarget returns undefined for an unknown caveat", () => {
    expect(caveatTarget(resolver, "missing")).toBeUndefined();
  });
});

describe("tokenAtPosition", () => {
  // Column is 1-indexed (Monaco convention). Reference line:
  // "document:firstdoc#viewer@user:tom"
  //  1       9        18     25   30
  const SIMPLE = "document:firstdoc#viewer@user:tom";

  it("classifies the resource type", () => {
    expect(tokenAtPosition(SIMPLE, 3)).toEqual({ kind: "type", name: "document" });
  });

  it("classifies the resource relation with its owning type", () => {
    expect(tokenAtPosition(SIMPLE, 20)).toEqual({
      kind: "relation",
      name: "viewer",
      resourceType: "document",
    });
  });

  it("classifies the subject type", () => {
    expect(tokenAtPosition(SIMPLE, 27)).toEqual({ kind: "type", name: "user" });
  });

  it("returns undefined for object ids", () => {
    expect(tokenAtPosition(SIMPLE, 12)).toBeUndefined(); // firstdoc
    expect(tokenAtPosition(SIMPLE, 31)).toBeUndefined(); // tom
  });

  it("classifies a subject relation against the subject type", () => {
    const line = "document:doc#viewer@group:eng#member";
    expect(tokenAtPosition(line, 33)).toEqual({
      kind: "relation",
      name: "member",
      resourceType: "group",
    });
    expect(tokenAtPosition(line, 22)).toEqual({ kind: "type", name: "group" });
  });

  it("ignores the '...' subject relation", () => {
    const line = "document:doc#viewer@user:tom#...";
    expect(tokenAtPosition(line, 30)).toBeUndefined();
  });

  it("classifies a caveat name", () => {
    const line = 'document:doc#viewer@user:tom[somecaveat:{"ip":"1.2.3.4"}]';
    expect(tokenAtPosition(line, 32)).toEqual({ kind: "caveat", name: "somecaveat" });
  });

  it("does not treat an expiration block as a caveat", () => {
    const line = "document:doc#viewer@user:tom[expiration:2025-01-01T00:00:00Z]";
    expect(tokenAtPosition(line, 32)).toBeUndefined();
  });

  it("returns undefined for comments, blank lines, and out-of-range columns", () => {
    expect(tokenAtPosition("// a comment", 5)).toBeUndefined();
    expect(tokenAtPosition("   ", 2)).toBeUndefined();
    expect(tokenAtPosition(SIMPLE, 999)).toBeUndefined();
  });

  it("returns undefined for a malformed relationship", () => {
    expect(tokenAtPosition("not a relationship", 3)).toBeUndefined();
  });
});

describe("resolveGridCellTarget", () => {
  const resolver = buildResolver();
  // Grid column order: RESOURCE_TYPE(0), RESOURCE_ID(1), RELATION(2),
  // SUBJECT_TYPE(3), SUBJECT_ID(4), SUBJECT_RELATION(5), CAVEAT_NAME(6).
  const row = ["document", "doc1", "viewer", "document", "doc2", "viewer", "ip_match"];

  it("resolves a resource type cell", () => {
    expect(resolveGridCellTarget(resolver, DataKind.RESOURCE_TYPE, row, 0)).toEqual({
      line: 3,
      column: 1,
    });
  });

  it("resolves a subject type cell", () => {
    expect(resolveGridCellTarget(resolver, DataKind.SUBJECT_TYPE, row, 3)).toEqual({
      line: 3,
      column: 1,
    });
  });

  it("resolves a relation cell against the resource type two columns left", () => {
    expect(resolveGridCellTarget(resolver, DataKind.RELATION, row, 2)).toEqual({
      line: 4,
      column: 1,
    });
  });

  it("resolves a subject relation cell against the subject type two columns left", () => {
    expect(resolveGridCellTarget(resolver, DataKind.SUBJECT_RELATION, row, 5)).toEqual({
      line: 4,
      column: 1,
    });
  });

  it("resolves a caveat name cell", () => {
    expect(resolveGridCellTarget(resolver, DataKind.CAVEAT_NAME, row, 6)).toEqual({
      line: 8,
      column: 1,
    });
  });

  it("returns undefined for a non-jumpable column", () => {
    expect(resolveGridCellTarget(resolver, DataKind.RESOURCE_ID, row, 1)).toBeUndefined();
  });

  it("returns undefined for an empty cell value", () => {
    const emptyRow = ["", "", "", "", "", "", ""];
    expect(resolveGridCellTarget(resolver, DataKind.RESOURCE_TYPE, emptyRow, 0)).toBeUndefined();
  });

  it("returns undefined when the relation's owner type is empty", () => {
    const noOwner = ["", "doc1", "viewer", "", "", "", ""];
    expect(resolveGridCellTarget(resolver, DataKind.RELATION, noOwner, 2)).toBeUndefined();
  });

  it("returns undefined for an unresolved type", () => {
    const unknown = ["nonexistent", "x", "", "", "", "", ""];
    expect(resolveGridCellTarget(resolver, DataKind.RESOURCE_TYPE, unknown, 0)).toBeUndefined();
  });
});
