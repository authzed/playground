import { z } from "zod";

import type { AssistantTool } from "../types";

export const CommunityHelpSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .describe("Briefly explain why community input would help."),
  draft: z
    .string()
    .trim()
    .min(1)
    .max(1500)
    .describe(
      "A concise first-person Discord question: goal, observed problem, attempted fixes and verified results, and the unresolved question. Use only known facts; omit unknown details. No playground URL or chat transcript.",
    ),
});

export type CommunityHelpSuggestion = z.infer<typeof CommunityHelpSchema>;

export const suggestCommunityHelpTool: AssistantTool<CommunityHelpSuggestion, { ok: true }> = {
  name: "suggest_community_help",
  description:
    "Offer a reviewable Discord help draft when the user requests human help, you cannot confidently verify a solution, or repeated attempts have not resolved their issue. Only renders a suggestion; does not share playground data, copy text, open Discord, or post messages.",
  parameters: CommunityHelpSchema,
  execute: () => ({ ok: true }),
  render: (_result, input) => ({ kind: "community_help", ...input }),
  summarize: () => "Community help draft ready",
  icon: "↗",
  label: "Suggest community help",
  progressLabel: "Preparing community help",
};
