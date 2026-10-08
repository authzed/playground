import AppConfig from "../configservice";
import type { DatastoreDocs } from "../datastore";

import { ToolRegistry } from "./registry";
import { streamAssistant } from "./streamClient";
import { CommunityHelpSchema, suggestCommunityHelpTool } from "./tools/suggestCommunityHelp";
import type { ChatMessage } from "./types";

export function buildManualHelpDraft(messages: ChatMessage[]): string {
  const question = [...messages].reverse().find((m) => m.role === "user")?.content;
  return [
    "I'd like help with my SpiceDB playground.",
    `Question: ${question ? question.slice(0, 1000) : "[Describe what you need help with]"}`,
    "Goal: [What should happen?]",
    "Problem: [What happens instead?]",
    "Tried: [What have you tried, and what were the results?]",
  ].join("\n\n");
}

export function getDiscordDestination(config: {
  serverId?: string;
  channelId?: string;
  inviteUrl?: string;
}): string {
  if (
    config.serverId &&
    config.channelId &&
    /^\d+$/.test(config.serverId) &&
    /^\d+$/.test(config.channelId)
  ) {
    return `https://discord.com/channels/${config.serverId}/${config.channelId}`;
  }
  return config.inviteUrl || "https://authzed.com/discord";
}

/** Isolated summary request: never runs editing tools or changes the active conversation. */
export async function summarizeForCommunity(
  input: { messages: ChatMessage[]; state: DatastoreDocs; signal: AbortSignal },
  stream: typeof streamAssistant = streamAssistant,
): Promise<string> {
  const registry = new ToolRegistry();
  registry.register(suggestCommunityHelpTool);
  for await (const event of stream({
    endpoint: `${AppConfig().aiApiEndpoint ?? ""}/api/ai`,
    ...input,
    messages: [
      ...input.messages,
      {
        role: "user",
        content:
          "Prepare a concise Discord help request summarizing this conversation. Call suggest_community_help with the goal, observed problem, attempted fixes and verified results, and unresolved question. Omit unknown details. Do not solve the problem, edit the playground, invent a URL, or include the whole transcript.",
      },
    ],
    tools: registry.toWire(),
  })) {
    if (event.event === "error") throw new Error(event.data.message);
    if (event.event === "handoff") {
      for (const call of event.data.clientToolCalls) {
        if (call.name === suggestCommunityHelpTool.name) {
          return CommunityHelpSchema.parse(call.input).draft;
        }
      }
    }
  }
  throw new Error("No help draft was returned");
}
