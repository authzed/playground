import { parseSchema, Resolver, type TextRange } from "@authzed/spicedb-parser-js";

import type { AnnotationKind, AnnotationView, SchemaAnnotation, UnexplainedSymbol } from "./types";

/** djb2 string hash, base36. Deterministic; no crypto needed. */
export function hashSymbolSource(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export interface ResolvedSymbol {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  sourceText: string;
}

export function resolveSymbol(
  schemaText: string,
  symbolKind: AnnotationKind,
  symbolPath: string,
): ResolvedSymbol | undefined {
  const schema = parseSchema(schemaText);
  if (!schema) return undefined;
  const resolver = new Resolver(schema);

  let range: TextRange | undefined;
  if (symbolKind === "definition") {
    range = resolver.lookupDefinition(symbolPath)?.definition.range;
  } else if (symbolKind === "caveat") {
    // Resolver's ResolvedCaveatDefinition does not carry a populated range in
    // parser v1.2.0 (line/column/offset are all 0). The raw caveat node in the
    // parsed AST does, so read the range directly from there.
    const cav = schema.definitions.find((d) => d.kind === "caveatDef" && d.name === symbolPath) as
      | { range: TextRange }
      | undefined;
    range = cav?.range;
  } else {
    // Member names contain no "/", but definition names may (e.g. "sub/user").
    // The member is always the final segment.
    const idx = symbolPath.lastIndexOf("/");
    if (idx <= 0) return undefined;
    const defName = symbolPath.slice(0, idx);
    const member = symbolPath.slice(idx + 1);
    const node = resolver.lookupDefinition(defName)?.lookupRelationOrPermission(member);
    if (!node || node.kind !== symbolKind) return undefined;
    range = node.range;
  }
  if (!range) return undefined;

  return {
    startLine: range.startIndex.line,
    startColumn: range.startIndex.column,
    endLine: range.endIndex.line,
    endColumn: range.endIndex.column,
    sourceText: schema.stringValue.substring(range.startIndex.offset, range.endIndex.offset).trim(),
  };
}

export function listSchemaSymbols(schemaText: string): UnexplainedSymbol[] {
  const schema = parseSchema(schemaText);
  if (!schema) return [];
  const resolver = new Resolver(schema);
  const out: UnexplainedSymbol[] = [];

  for (const rd of resolver.listDefinitions()) {
    const def = rd.definition;
    out.push({
      symbolKind: "definition",
      symbolPath: def.name,
      startLine: def.range.startIndex.line,
    });
    for (const rp of rd.listRelationsAndPermissions()) {
      out.push({
        symbolKind: rp.kind as AnnotationKind, // "relation" | "permission"
        symbolPath: `${def.name}/${rp.name}`,
        startLine: rp.range.startIndex.line,
      });
    }
  }
  // Read caveats from the raw AST: Resolver's ResolvedCaveatDefinition does not
  // carry a populated range in parser v1.2.0 (see resolveSymbol).
  for (const d of schema.definitions) {
    if (d.kind !== "caveatDef") continue;
    out.push({
      symbolKind: "caveat",
      symbolPath: d.name,
      startLine: d.range.startIndex.line,
    });
  }
  return out;
}

export function computeAnnotationViews(
  schemaText: string,
  annotations: SchemaAnnotation[],
): { views: AnnotationView[]; unexplained: UnexplainedSymbol[] } {
  const views: AnnotationView[] = [];
  for (const a of annotations) {
    const r = resolveSymbol(schemaText, a.symbolKind, a.symbolPath);
    if (!r) continue;
    views.push({
      annotation: a,
      startLine: r.startLine,
      startColumn: r.startColumn,
      endLine: r.endLine,
      endColumn: r.endColumn,
      stale: hashSymbolSource(r.sourceText) !== a.sourceHash,
    });
  }

  const annotated = new Set(annotations.map((a) => `${a.symbolKind}:${a.symbolPath}`));
  const unexplained = listSchemaSymbols(schemaText).filter(
    (s) => !annotated.has(`${s.symbolKind}:${s.symbolPath}`),
  );
  return { views, unexplained };
}
