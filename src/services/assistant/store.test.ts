import { beforeEach, describe, expect, it } from "vitest";

import { useAssistantStore } from "./store";

describe("useAssistantStore", () => {
  beforeEach(() => useAssistantStore.getState().reset());

  it("appends a user message to both messages and display", () => {
    useAssistantStore.getState().appendUser("hello");
    const s = useAssistantStore.getState();
    expect(s.messages[s.messages.length - 1]).toEqual({ role: "user", content: "hello" });
    expect(s.display[s.display.length - 1]).toMatchObject({ role: "user", text: "hello" });
  });

  it("tracks status and errors", () => {
    useAssistantStore.getState().setStatus("error", { message: "boom" });
    expect(useAssistantStore.getState().status).toBe("error");
    expect(useAssistantStore.getState().error?.message).toBe("boom");
  });

  it("reset clears messages", () => {
    useAssistantStore.getState().appendUser("x");
    useAssistantStore.getState().reset();
    expect(useAssistantStore.getState().messages).toEqual([]);
  });

  it("requestPrompt sets pendingPrompt and consumePrompt clears it", () => {
    useAssistantStore.getState().requestPrompt("debug this");
    expect(useAssistantStore.getState().pendingPrompt).toBe("debug this");
    useAssistantStore.getState().consumePrompt();
    expect(useAssistantStore.getState().pendingPrompt).toBeNull();
  });

  it("reset clears a pending prompt", () => {
    useAssistantStore.getState().requestPrompt("debug this");
    useAssistantStore.getState().reset();
    expect(useAssistantStore.getState().pendingPrompt).toBeNull();
  });
});
