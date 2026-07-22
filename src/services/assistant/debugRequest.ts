import posthog from "posthog-js";

import { useRightDockStore } from "../../components/rightdock/state";

import { useAssistantStore } from "./store";

export type DebugSource = "editor" | "watches" | "problems";

/**
 * requestAssistantDebug is the single entry point every inline/UI "Ask
 * assistant to debug/fix" affordance calls. It opens the assistant dock panel
 * (mounting AssistantPanel, whose usePendingPromptConsumer hook then submits)
 * and stashes the prompt. A plain function (not a hook) so it is callable from
 * React components AND from the module-scope Monaco CodeLens command handler.
 */
export function requestAssistantDebug(prompt: string, source: DebugSource): void {
  posthog.capture("playground_ai_debug_requested", { source });
  useRightDockStore.getState().openPanel("assistant");
  useAssistantStore.getState().requestPrompt(prompt);
}
