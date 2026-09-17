import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import { useRightDockStore } from "../../components/rightdock/state";
import { useAssistantStore } from "../assistant/store";

import { requestSchemaExplanation, SCHEMA_EXPLAIN_PROMPT } from "./generate";
import { useSchemaAnnotationStore } from "./store";

describe("requestSchemaExplanation", () => {
  beforeEach(() => {
    useAssistantStore.getState().reset();
    useRightDockStore.getState().closeDock();
    useSchemaAnnotationStore.getState().reset();
    vi.clearAllMocks();
  });

  it("opens the assistant panel, queues the prompt, and marks generating", () => {
    requestSchemaExplanation();
    expect(useAssistantStore.getState().pendingPrompt).toBe(SCHEMA_EXPLAIN_PROMPT);
    expect(useSchemaAnnotationStore.getState().status).toBe("generating");
    const dock = useRightDockStore.getState();
    expect(dock.open).toBe(true);
    expect(dock.activePanel).toBe("assistant");
  });
});
