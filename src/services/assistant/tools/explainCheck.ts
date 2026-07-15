import { z } from "zod";

import type { CheckDebugTrace } from "../../../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import { checkInputToWatch } from "../checkFormat";
import { explainCheck } from "../runners";
import { traceToText } from "../traceText";
import type { AssistantTool, ToolContext } from "../types";

const InputSchema = z.object({
  resource: z.string().describe("e.g. document:readme"),
  permission: z.string().describe("permission or relation name, e.g. view"),
  subject: z.string().describe("e.g. user:alice or group:eng#member"),
  caveat_context: z.string().optional().describe("optional caveat context, e.g. ip:1.2.3.4"),
});

export interface ExplainCheckResult {
  result: "allowed" | "denied" | "conditional" | "error";
  message?: string;
  missingContext?: string[];
  explanation?: string;
  // Structured trace for the chat UI. The controller strips this from the
  // model-facing result (it renders the trace tree instead).
  trace?: CheckDebugTrace;
}

export const explainCheckTool: AssistantTool<z.infer<typeof InputSchema>, ExplainCheckResult> = {
  name: "explain_check",
  description:
    "Evaluate a permission check AND return its debug trace explaining WHY it resolved to " +
    "allowed/denied/conditional — which relation/permission branch granted or denied access, and " +
    "where a caveat was true/false/missing-context. The trace is also rendered as an interactive " +
    "tree in the chat. Use this when the user asks why a check passes, fails, or is conditional.",
  parameters: InputSchema,
  execute(input, ctx: ToolContext): ExplainCheckResult {
    const r = explainCheck(
      ctx.getServices().developerService,
      ctx.datastore,
      checkInputToWatch(input),
    );
    const trace = r.debugInformation?.check;
    return {
      result: r.result,
      message: r.message,
      missingContext: r.missingContext,
      explanation: trace ? traceToText(trace) : undefined,
      trace,
    };
  },
  redactFromModel: ["trace"],
  render(result) {
    return result.trace ? { kind: "trace", trace: result.trace } : undefined;
  },
};
