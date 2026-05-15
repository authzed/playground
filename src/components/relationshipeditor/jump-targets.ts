import { Resolver } from "@authzed/spicedb-parser-js";

import { SchemaRevealLocation } from "@/components/editor-groups/schema-jump";

import { DataKind } from "./columns";

/**
 * typeTarget resolves an object/definition name to the start of its definition
 * in the schema, or undefined if the schema does not define it.
 */
export function typeTarget(
  resolver: Resolver,
  typeName: string,
): SchemaRevealLocation | undefined {
  const def = resolver.lookupDefinition(typeName);
  if (!def) {
    return undefined;
  }
  const start = def.definition.range.startIndex;
  return { line: start.line, column: start.column };
}

/**
 * relationTarget resolves a relation or permission on the given type to the
 * start of its declaration in the schema, or undefined if either the type or
 * the relation/permission is not defined.
 */
export function relationTarget(
  resolver: Resolver,
  typeName: string,
  relationName: string,
): SchemaRevealLocation | undefined {
  const def = resolver.lookupDefinition(typeName);
  if (!def) {
    return undefined;
  }
  const relationOrPermission = def.lookupRelationOrPermission(relationName);
  if (!relationOrPermission) {
    return undefined;
  }
  const start = relationOrPermission.range.startIndex;
  return { line: start.line, column: start.column };
}

/**
 * caveatTarget resolves a caveat name to the start of its definition in the
 * schema, or undefined if the schema does not define it. ResolvedCaveatDefinition
 * (from listCaveats) has a zeroed-out range, so this scans the raw schema
 * definitions for the caveatDef node directly.
 */
export function caveatTarget(
  resolver: Resolver,
  caveatName: string,
): SchemaRevealLocation | undefined {
  const caveat = resolver.schema.definitions.find(
    (d) => d.kind === "caveatDef" && d.name === caveatName,
  );
  if (!caveat) {
    return undefined;
  }
  const start = caveat.range.startIndex;
  return { line: start.line, column: start.column };
}

/**
 * ClickedToken describes a jumpable token identified inside a relationship line.
 * `relation` carries the owning type so the relation can be resolved against it.
 */
export type ClickedToken =
  | { kind: "type"; name: string }
  | { kind: "relation"; name: string; resourceType: string }
  | { kind: "caveat"; name: string };

/**
 * tokenAtPosition classifies the token under a 1-indexed column in a single
 * relationship line. It segments the line on the unambiguous delimiters
 * `:` `#` `@` `[` — none of which can appear inside a type, id, or relation
 * token — and returns the jumpable token there, or undefined when the column
 * is on an object id / caveat context / expiration, or the line is not a
 * parseable relationship.
 */
export function tokenAtPosition(lineText: string, column: number): ClickedToken | undefined {
  const idx = column - 1; // 0-indexed offset into lineText
  if (idx < 0 || idx >= lineText.length) {
    return undefined;
  }

  const trimmedStart = lineText.search(/\S/);
  if (trimmedStart < 0 || lineText.slice(trimmedStart).startsWith("//")) {
    return undefined;
  }

  // Resource part: everything before the first '@'.
  const atIndex = lineText.indexOf("@");
  if (atIndex < 0) {
    return undefined;
  }
  const resourceColon = lineText.indexOf(":");
  const resourceHash = lineText.indexOf("#");
  if (
    resourceColon < 0 ||
    resourceHash < 0 ||
    resourceColon > atIndex ||
    resourceHash > atIndex ||
    resourceHash < resourceColon
  ) {
    return undefined;
  }

  const resourceType = lineText.slice(trimmedStart, resourceColon).trim();
  const resourceRelStart = resourceHash + 1;

  // resourceType span: [trimmedStart, resourceColon)
  if (idx >= trimmedStart && idx < resourceColon) {
    return { kind: "type", name: resourceType };
  }
  // resourceRel span: [resourceHash + 1, atIndex)
  if (idx >= resourceRelStart && idx < atIndex) {
    const name = lineText.slice(resourceRelStart, atIndex).trim();
    return { kind: "relation", name, resourceType };
  }

  // Subject part: everything after the first '@'.
  const subjBase = atIndex + 1;
  const subjectPart = lineText.slice(subjBase);
  const subjColonRel = subjectPart.indexOf(":");
  if (subjColonRel < 0) {
    return undefined;
  }
  const subjectType = subjectPart.slice(0, subjColonRel).trim();

  // subjectType span: [subjBase, subjBase + subjColonRel)
  if (idx >= subjBase && idx < subjBase + subjColonRel) {
    return { kind: "type", name: subjectType };
  }

  const subjBracket = subjectPart.indexOf("[");

  // Optional subject relation: '#<rel>' after the subject id.
  const subjHash = subjectPart.indexOf("#", subjColonRel + 1);
  if (subjHash >= 0) {
    const relStart = subjHash + 1;
    const relEnd = subjBracket > subjHash ? subjBracket : subjectPart.length;
    if (idx >= subjBase + relStart && idx < subjBase + relEnd) {
      const name = subjectPart.slice(relStart, relEnd).trim();
      if (name === "...") {
        return undefined;
      }
      return { kind: "relation", name, resourceType: subjectType };
    }
  }

  // Optional caveat: the first '[' block, unless it is an expiration block.
  // Caveat context is JSON and may contain ']'/'['/':' — but the caveat NAME
  // always sits immediately after '[' and ends at the first ':' or ']'.
  if (subjBracket >= 0) {
    const afterBracket = subjectPart.slice(subjBracket + 1);
    const stop = afterBracket.search(/[:\]]/);
    const namePart = stop >= 0 ? afterBracket.slice(0, stop) : afterBracket;
    if (namePart !== "expiration") {
      const nameStart = subjBase + subjBracket + 1;
      const nameEnd = nameStart + namePart.length;
      if (idx >= nameStart && idx < nameEnd) {
        return { kind: "caveat", name: namePart.trim() };
      }
    }
  }

  return undefined;
}

/**
 * resolveGridCellTarget resolves the jump target for a relationship-grid cell,
 * given the cell's column `dataKind`, the row's `columnData`, and the cell's
 * (marker-excluded) column index. Returns undefined for non-jumpable columns,
 * empty cell values, or tokens not present in the schema.
 *
 * The owning type for a relation cell sits two columns to the left of the
 * relation column (resource type for RELATION, subject type for
 * SUBJECT_RELATION).
 */
export function resolveGridCellTarget(
  resolver: Resolver,
  dataKind: DataKind,
  columnData: readonly string[],
  col: number,
): SchemaRevealLocation | undefined {
  const value = columnData[col];
  if (!value) {
    return undefined;
  }
  switch (dataKind) {
    case DataKind.RESOURCE_TYPE:
    case DataKind.SUBJECT_TYPE:
      return typeTarget(resolver, value);
    case DataKind.RELATION:
    case DataKind.SUBJECT_RELATION: {
      const typeName = columnData[col - 2];
      if (!typeName) {
        return undefined;
      }
      return relationTarget(resolver, typeName, value);
    }
    case DataKind.CAVEAT_NAME:
      return caveatTarget(resolver, value);
    default:
      return undefined;
  }
}
