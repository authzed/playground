import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { useAssistantStore } from "../../services/assistant/store";
import { usePendingPromptConsumer } from "../../services/assistant/usePendingPrompt";

function Harness({ submit }: { submit: (text: string) => void }) {
  usePendingPromptConsumer(submit);
  return null;
}

describe("usePendingPromptConsumer", () => {
  beforeEach(() => useAssistantStore.getState().reset());

  it("submits and clears the pending prompt when idle", async () => {
    const submit = vi.fn();
    await render(<Harness submit={submit} />);
    useAssistantStore.getState().requestPrompt("hello");
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith("hello"));
    expect(useAssistantStore.getState().pendingPrompt).toBeNull();
  });

  it("defers submission while a turn is in flight, then fires when idle", async () => {
    const submit = vi.fn();
    useAssistantStore.getState().setStatus("streaming");
    await render(<Harness submit={submit} />);
    useAssistantStore.getState().requestPrompt("later");
    // Give the effect a chance to (not) run.
    await new Promise((r) => setTimeout(r, 50));
    expect(submit).not.toHaveBeenCalled();
    useAssistantStore.getState().setStatus("idle");
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith("later"));
  });

  it("submits from a terminal error state (does not wait for idle)", async () => {
    const submit = vi.fn();
    useAssistantStore.getState().setStatus("error", { message: "boom" });
    await render(<Harness submit={submit} />);
    useAssistantStore.getState().requestPrompt("recover");
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith("recover"));
    expect(useAssistantStore.getState().pendingPrompt).toBeNull();
  });
});
