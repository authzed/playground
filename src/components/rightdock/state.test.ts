import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_STATE, useRightDockStore } from "./state";

describe("useRightDockStore", () => {
  beforeEach(() => useRightDockStore.getState().closeDock());

  it("defaults new visitors to the assistant panel open", () => {
    expect(DEFAULT_STATE.open).toBe(true);
    expect(DEFAULT_STATE.activePanel).toBe("assistant");
  });

  it("opens a panel", () => {
    useRightDockStore.getState().openPanel("assistant");
    const s = useRightDockStore.getState();
    expect(s.open).toBe(true);
    expect(s.activePanel).toBe("assistant");
  });

  it("toggles a panel closed when it is already active", () => {
    useRightDockStore.getState().openPanel("history");
    useRightDockStore.getState().togglePanel("history");
    expect(useRightDockStore.getState().open).toBe(false);
  });

  it("clamps width to a minimum", () => {
    useRightDockStore.getState().setWidth("assistant", 10);
    expect(useRightDockStore.getState().perPanelWidth.assistant).toBeGreaterThanOrEqual(240);
  });
});
