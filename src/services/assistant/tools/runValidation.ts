import { z } from "zod";

import { runValidation, type ValidationRunResult } from "../runners";
import type { AssistantTool, ToolContext } from "../types";

const InputSchema = z.object({});

export const runValidationTool: AssistantTool<z.infer<typeof InputSchema>, ValidationRunResult> = {
  name: "run_validation",
  description:
    "Run the current assertions and expected-relations against the schema + relationships and " +
    "report pass/fail plus any failures.",
  parameters: InputSchema,
  execute(_input, ctx: ToolContext) {
    return runValidation(ctx.getServices().developerService, ctx.datastore);
  },
  isError: (result) => !result.passed,
  summarize: (result) => (result.passed ? "validation passed" : "validation failed"),
  icon: "✅",
  label: "Run validation",
};
