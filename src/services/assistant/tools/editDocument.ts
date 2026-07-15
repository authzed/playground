import { z } from "zod";

import { DataStoreItemKind } from "../../datastore";
import type { AssistantTool, ToolContext } from "../types";

export const KIND_BY_TARGET = {
  schema: DataStoreItemKind.SCHEMA,
  relationships: DataStoreItemKind.RELATIONSHIPS,
  assertions: DataStoreItemKind.ASSERTIONS,
  expected: DataStoreItemKind.EXPECTED_RELATIONS,
} as const;

const InputSchema = z.object({
  target: z.enum(["schema", "relationships", "assertions", "expected"]),
  op: z.enum(["str_replace", "write"]),
  old_string: z.string().optional(),
  new_string: z.string().optional(),
  content: z.string().optional(),
});
type EditDocumentInput = z.infer<typeof InputSchema>;

export interface EditDocumentResult {
  ok: boolean;
  target: string;
  applied_summary?: string;
  error?: string;
  match_count?: number;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

export const editDocumentTool: AssistantTool<EditDocumentInput, EditDocumentResult> = {
  name: "edit_document",
  description:
    "Edit one of the playground documents. Use op 'str_replace' with a UNIQUE old_string for " +
    "targeted edits, or op 'write' with full content to replace the whole document.",
  parameters: InputSchema,
  execute(input, ctx: ToolContext): EditDocumentResult {
    const item = ctx.datastore.getSingletonByKind(KIND_BY_TARGET[input.target]);
    const before = item.editableContents;
    let after: string;

    if (input.op === "write") {
      if (input.content === undefined) {
        return { ok: false, target: input.target, error: "write requires a 'content' value." };
      }
      after = input.content;
    } else {
      const oldStr = input.old_string ?? "";
      const count = countOccurrences(before, oldStr);
      if (count === 0) {
        return {
          ok: false,
          target: input.target,
          error: "old_string matched 0 times; it must match exactly once.",
        };
      }
      if (count > 1) {
        return {
          ok: false,
          target: input.target,
          match_count: count,
          error: `old_string matched ${count} times; make it unique.`,
        };
      }
      after = before.replace(oldStr, input.new_string ?? "");
    }

    ctx.datastore.update(item, after);
    ctx.history.record({ source: "ai", label: `Edited ${input.target}` });
    return { ok: true, target: input.target, applied_summary: `Updated ${input.target}.` };
  },
};
