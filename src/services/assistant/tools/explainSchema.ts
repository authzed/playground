import { z } from "zod";

import { DataStoreItemKind } from "../../datastore";
import { hashSymbolSource, resolveSymbol } from "../../schemaAnnotations/resolve";
import { useSchemaAnnotationStore } from "../../schemaAnnotations/store";
import type { SchemaAnnotation } from "../../schemaAnnotations/types";
import type { AssistantTool, ToolContext } from "../types";

const EntrySchema = z.object({
  symbolPath: z
    .string()
    .describe("'Name' for a definition or caveat; 'Def/member' for a relation or permission."),
  symbolKind: z.enum(["definition", "relation", "permission", "caveat"]),
  shortLabel: z.string().describe("A concise end-of-line tag, a few words."),
  explanation: z.string().describe("1-3 sentence markdown explanation."),
});

const InputSchema = z.object({
  annotations: z.array(EntrySchema).min(1),
  show: z
    .enum(["compact", "full"])
    .optional()
    .describe(
      "How to reveal the explanations if they are currently hidden. Ignored when the user " +
        "already has them showing; defaults to full.",
    ),
});
export type ExplainSchemaInput = z.infer<typeof InputSchema>;

export interface ExplainSchemaResult {
  ok: boolean;
  explained_count: number;
  unknown_symbols: string[];
}

export const explainSchemaTool: AssistantTool<ExplainSchemaInput, ExplainSchemaResult> = {
  name: "explain_schema",
  description:
    "Explain the SpiceDB schema by attaching inline explanations to its symbols. Provide one " +
    "entry per definition, each of its relations and permissions, and each caveat. The " +
    "explanations render as ghosted inline annotations in the editor and are never written into " +
    "the schema text.",
  parameters: InputSchema,
  execute(input, ctx: ToolContext): ExplainSchemaResult {
    const schema = ctx.datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents;

    const valid: SchemaAnnotation[] = [];
    const unknown: string[] = [];
    for (const entry of input.annotations) {
      const resolved = resolveSymbol(schema, entry.symbolKind, entry.symbolPath);
      if (!resolved) {
        unknown.push(entry.symbolPath);
        continue;
      }
      valid.push({
        symbolKind: entry.symbolKind,
        symbolPath: entry.symbolPath,
        shortLabel: entry.shortLabel,
        explanation: entry.explanation,
        sourceHash: hashSymbolSource(resolved.sourceText),
      });
    }

    // Only write when at least one symbol resolved. An all-unknown call must
    // report its unknowns for self-correction WITHOUT wiping any previously
    // stored annotations or flipping the density toggle.
    if (valid.length > 0) {
      const store = useSchemaAnnotationStore.getState();
      // If explanations are already showing (e.g. the user picked Compact and
      // that is what triggered this run), their chosen density wins; `show` only
      // decides how to reveal them when they were hidden.
      const density = store.toggleState === "off" ? (input.show ?? "full") : store.toggleState;
      store.setAnnotations(valid, density);
    }
    return { ok: valid.length > 0, explained_count: valid.length, unknown_symbols: unknown };
  },
  summarize(result) {
    const base = `Explained ${result.explained_count} symbol${result.explained_count === 1 ? "" : "s"}`;
    return result.unknown_symbols.length
      ? `${base}; skipped unknown: ${result.unknown_symbols.join(", ")}`
      : base;
  },
  icon: "💡",
  label: "Explain schema",
  progressLabel: "Explaining schema",
};
