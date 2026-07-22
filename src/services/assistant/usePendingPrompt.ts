import { useEffect } from "react";

import { useAssistantStore } from "./store";

/**
 * usePendingPromptConsumer drains a one-shot pendingPrompt (set by
 * requestAssistantDebug) into the assistant turn. Mounted inside AssistantPanel,
 * so opening the dock → mounting the panel → this effect fires the submit. It
 * only waits while a turn is genuinely busy (streaming or executing tools —
 * no lost click, no interrupting the running turn); it deliberately still
 * fires from the terminal "error" state, since that state has no
 * auto-transition back to "idle" and would otherwise dead-lock the affordance.
 * Clears before submit to avoid a re-fire.
 */
export function usePendingPromptConsumer(submit: (text: string) => void): void {
  const pendingPrompt = useAssistantStore((s) => s.pendingPrompt);
  const status = useAssistantStore((s) => s.status);
  const consumePrompt = useAssistantStore((s) => s.consumePrompt);

  useEffect(() => {
    const busy = status === "streaming" || status === "executing_tools";
    if (!pendingPrompt || busy) return;
    const text = pendingPrompt;
    consumePrompt();
    submit(text);
  }, [pendingPrompt, status, submit, consumePrompt]);
}
