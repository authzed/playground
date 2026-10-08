import { describe, expect, it } from "vitest";

import {
  buildManualHelpDraft,
  getDiscordDestination,
  summarizeForCommunity,
} from "./communityHelp";
import { runAssistantTurn } from "./controller";
import type { StreamRequest } from "./streamClient";
import { buildDefaultRegistry } from "./tools";
import type { SseEvent } from "./types";
import type { DisplayArtifact, ToolContext } from "./types";

describe("community help drafts", () => {
  it("uses the latest user question without copying the whole conversation", () => {
    const draft = buildManualHelpDraft([
      { role: "user", content: "Earlier private context" },
      { role: "assistant", content: "Speculation" },
      { role: "user", content: "Why is view denied?" },
    ]);
    expect(draft).toContain("Why is view denied?");
    expect(draft).not.toContain("Earlier private context");
    expect(draft).not.toContain("Speculation");
    expect(buildManualHelpDraft([])).toContain("[Describe");
  });

  it("targets a configured channel and provides an invite fallback", () => {
    expect(getDiscordDestination({ serverId: "123", channelId: "456" })).toBe(
      "https://discord.com/channels/123/456",
    );
    expect(getDiscordDestination({ inviteUrl: "https://discord.gg/example" })).toBe(
      "https://discord.gg/example",
    );
    expect(getDiscordDestination({})).toBe("https://authzed.com/discord");
  });

  it("extracts a validated summary without executing model tool calls", async () => {
    async function* stream(request: StreamRequest): AsyncGenerator<SseEvent> {
      expect(request.tools.map((t) => t.name)).toEqual(["suggest_community_help"]);
      yield {
        event: "handoff",
        data: {
          assistantMessage: { role: "assistant", content: null },
          serverToolResults: [],
          clientToolCalls: [
            {
              id: "help",
              name: "suggest_community_help",
              input: {
                reason: "Needs human review",
                draft:
                  "Goal: grant view. Problem: denied. Tried: check. Question: missing relationship?",
              },
            },
          ],
        },
      };
    }
    expect(
      await summarizeForCommunity(
        {
          messages: [],
          state: { schema: "", relationships: "", assertions: "", expected: "" },
          signal: new AbortController().signal,
        },
        stream,
      ),
    ).toContain("Question: missing relationship?");
  });

  it("fails explicitly when the AI cannot produce a draft", async () => {
    async function* stream(): AsyncGenerator<SseEvent> {
      yield { event: "error", data: { message: "Unavailable" } };
    }
    await expect(
      summarizeForCommunity(
        {
          messages: [],
          state: { schema: "", relationships: "", assertions: "", expected: "" },
          signal: new AbortController().signal,
        },
        stream,
      ),
    ).rejects.toThrow("Unavailable");
  });

  it("renders a community suggestion through the controller without touching playground services", async () => {
    const artifacts: DisplayArtifact[] = [];
    let turn = 0;
    const input = {
      reason: "The check remains denied",
      draft: "Why is view denied after adding membership?",
    };
    const ctx = new Proxy({} as ToolContext, {
      get() {
        throw new Error("Suggestion must not use playground services");
      },
    });
    const result = await runAssistantTurn([{ role: "user", content: "I need a human" }], {
      registry: buildDefaultRegistry(),
      ctx,
      getState: () => ({ schema: "", relationships: "", assertions: "", expected: "" }),
      onText: () => {},
      onToolStart: () => {},
      onToolEnd: () => {},
      onStatus: () => {},
      onArtifact: (artifact) => artifacts.push(artifact),
      stream: async function* () {
        if (turn++ === 0) {
          yield {
            event: "handoff",
            data: {
              assistantMessage: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "help",
                    type: "function",
                    function: { name: "suggest_community_help", arguments: JSON.stringify(input) },
                  },
                ],
              },
              serverToolResults: [],
              clientToolCalls: [{ id: "help", name: "suggest_community_help", input }],
            },
          };
        } else {
          yield {
            event: "done",
            data: {
              assistantMessage: { role: "assistant", content: "Review the draft." },
              finish_reason: "stop",
            },
          };
        }
      },
    });
    expect(result.error).toBeUndefined();
    expect(artifacts).toEqual([
      {
        kind: "community_help",
        reason: "The check remains denied",
        draft: "Why is view denied after adding membership?",
      },
    ]);
  });
});
