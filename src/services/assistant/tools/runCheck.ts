import { z } from "zod";

import { checkInputToWatch } from "../checkFormat";
import { type CheckRunResult, runCheck } from "../runners";
import type { AssistantTool, ToolContext } from "../types";

const InputSchema = z.object({
  resource: z.string().describe("e.g. document:readme"),
  permission: z.string().describe("permission or relation name, e.g. view"),
  subject: z.string().describe("e.g. user:alice or group:eng#member"),
  caveat_context: z.string().optional().describe("optional caveat context, e.g. ip:1.2.3.4"),
});

export const runCheckTool: AssistantTool<z.infer<typeof InputSchema>, CheckRunResult> = {
  name: "run_check",
  description:
    "Evaluate a single permission check against the current schema + relationships and return " +
    "the real result (allowed/denied/conditional). Prefer this over guessing.",
  parameters: InputSchema,
  execute(input, ctx: ToolContext) {
    return runCheck(ctx.getServices().developerService, ctx.datastore, checkInputToWatch(input));
  },
  isError: (result) => result.result === "error",
  summarize: (result) => `check ⟹ ${result.result}`,
  icon: "🔍",
  label: "Run check",
};
