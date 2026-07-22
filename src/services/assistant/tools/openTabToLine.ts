import { z } from "zod";

import type { AssistantTool, ToolContext } from "../types";

import { KIND_BY_TARGET } from "./editDocument";

const InputSchema = z.object({
  target: z.enum(["schema", "relationships", "assertions", "expected"]),
  line: z.number().int().min(1),
  end_line: z.number().int().min(1).optional(),
  column: z.number().int().min(1).optional(),
});

export const openTabToLineTool: AssistantTool<z.infer<typeof InputSchema>> = {
  name: "open_tab_to_line",
  description:
    "Open a document tab and scroll the editor to a specific line (to ground an explanation).",
  parameters: InputSchema,
  execute(input, ctx: ToolContext) {
    ctx.openDocument(input.target);
    ctx.reveal(KIND_BY_TARGET[input.target], {
      startLine: input.line,
      startColumn: input.column,
      endLine: input.end_line,
      endColumn: undefined,
    });
    return { ok: true };
  },
  summarize: (_result, input) => `opened ${input.target}:${input.line}`,
  icon: "↪",
  label: "Open tab",
};
