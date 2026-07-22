import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ChatMessage, DisplayArtifact } from "./types";

export type AssistantStatus = "idle" | "streaming" | "executing_tools" | "error";

export interface ToolActivity {
  name: string;
  summary: string;
  ok: boolean;
}
export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolActivity: ToolActivity[];
  artifacts: DisplayArtifact[];
  checkpointRevisionId?: string;
  state?: "pending" | "done" | "error";
  errorText?: string;
}

export interface AssistantState {
  messages: ChatMessage[];
  display: DisplayMessage[];
  status: AssistantStatus;
  error?: { message: string; retryAfter?: number };
  // Bumped by reset() so an in-flight turn's async continuation can tell a
  // reset happened mid-turn and skip resurrecting stale results into the store.
  generation: number;
  // A one-shot prompt requested from outside the panel (e.g. an inline "Ask
  // assistant to fix" affordance). AssistantPanel consumes it on mount/idle and
  // submits it. Transient — deliberately excluded from `partialize` so a reload
  // never re-fires a stale request.
  pendingPrompt: string | null;
  reset: () => void;
  setStatus: (s: AssistantStatus, error?: AssistantState["error"]) => void;
  appendUser: (text: string) => void;
  setMessages: (m: ChatMessage[]) => void;
  setDisplay: (d: DisplayMessage[]) => void;
  requestPrompt: (text: string) => void;
  consumePrompt: () => void;
}

const MAX_PERSISTED_MESSAGES = 40;

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      messages: [],
      display: [],
      status: "idle",
      error: undefined,
      generation: 0,
      pendingPrompt: null,
      reset: () =>
        set((s) => ({
          messages: [],
          display: [],
          status: "idle",
          error: undefined,
          pendingPrompt: null,
          generation: s.generation + 1,
        })),
      setStatus: (status, error) => set({ status, error }),
      appendUser: (text) =>
        set((s) => ({
          messages: [...s.messages, { role: "user", content: text }],
          display: [
            ...s.display,
            { id: `u-${s.display.length}`, role: "user", text, toolActivity: [], artifacts: [] },
          ],
        })),
      setMessages: (messages) => set({ messages }),
      setDisplay: (display) => set({ display }),
      requestPrompt: (text) => set({ pendingPrompt: text }),
      consumePrompt: () => set({ pendingPrompt: null }),
    }),
    {
      name: "playground-assistant-state",
      // v3: ChatMessage moved from Anthropic content-blocks to OpenAI-style
      // tool_calls/tool-role messages (the OpenRouter migration). The old shape
      // is incompatible with the new /api/ai wire schema, so drop persisted
      // chat on upgrade rather than migrating it (same pattern as v2).
      version: 3,
      migrate: () => ({ messages: [], display: [] }),
      partialize: (s) => ({
        messages: s.messages.slice(-MAX_PERSISTED_MESSAGES),
        // Trace artifacts are large protobuf trees — don't persist them (diffs stay).
        display: s.display.slice(-MAX_PERSISTED_MESSAGES).map((m) => ({
          ...m,
          artifacts: m.artifacts.filter((a) => a.kind !== "trace"),
        })),
      }),
    },
  ),
);
