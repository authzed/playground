import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import posthog from "posthog-js";

import { useRightDockStore } from "../../components/rightdock/state";

import { requestAssistantDebug } from "./debugRequest";
import { useAssistantStore } from "./store";

describe("requestAssistantDebug", () => {
  beforeEach(() => {
    useAssistantStore.getState().reset();
    useRightDockStore.getState().closeDock();
    vi.clearAllMocks();
  });

  it("opens the assistant dock and sets the pending prompt", () => {
    requestAssistantDebug("fix line 4", "editor");
    expect(useAssistantStore.getState().pendingPrompt).toBe("fix line 4");
    const dock = useRightDockStore.getState();
    expect(dock.open).toBe(true);
    expect(dock.activePanel).toBe("assistant");
  });

  it("captures a PostHog event tagged with the source", () => {
    requestAssistantDebug("fix it", "watches");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(posthog.capture).toHaveBeenCalledWith("playground_ai_debug_requested", {
      source: "watches",
    });
  });
});
