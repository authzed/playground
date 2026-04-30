// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "./state";

describe("editor groups store", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    localStorage.removeItem("playground-editor-state");
  });

  it("starts with default state", () => {
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    expect(s.closedPool).toEqual(["visualizer"]);
  });

  it("setActiveTab updates the active tab in a group", () => {
    useEditorStore.getState().setActiveTab("g1", "relationships");
    const s = useEditorStore.getState();
    expect(s.layout.kind === "single" && s.layout.group.activeTab).toBe("relationships");
  });

  it("splitTab moves a tab to a new secondary group", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("split");
    if (s.layout.kind === "split") {
      expect(s.layout.primary.tabs).not.toContain("relationships");
      expect(s.layout.secondary.tabs).toEqual(["relationships"]);
    }
  });

  it("splitTab is a no-op when only one tab is open", () => {
    useEditorStore.getState().closeTab("relationships");
    useEditorStore.getState().closeTab("assertions");
    useEditorStore.getState().closeTab("expected");
    useEditorStore.getState().splitTab("schema", "horizontal");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
  });

  it("closeTab cannot close the last tab in the only group", () => {
    useEditorStore.getState().closeTab("relationships");
    useEditorStore.getState().closeTab("assertions");
    useEditorStore.getState().closeTab("expected");
    useEditorStore.getState().closeTab("schema");
    const s = useEditorStore.getState();
    expect(s.layout.kind === "single" && s.layout.group.tabs).toEqual(["schema"]);
    expect(s.closedPool).not.toContain("schema");
  });

  it("openInGroup moves a doc from closed pool to a group's tabs", () => {
    useEditorStore.getState().openInGroup("visualizer", "g1");
    const s = useEditorStore.getState();
    expect(s.closedPool).not.toContain("visualizer");
    expect(s.layout.kind === "single" && s.layout.group.tabs).toContain("visualizer");
    expect(s.layout.kind === "single" && s.layout.group.activeTab).toBe("visualizer");
  });

  it("closeGroup merges tabs into the surviving group", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    useEditorStore.getState().closeGroup("g2");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    if (s.layout.kind === "single") {
      expect(s.layout.group.tabs).toContain("relationships");
    }
  });

  it("moveTab between groups", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    useEditorStore.getState().moveTab("schema", "g2");
    const s = useEditorStore.getState();
    if (s.layout.kind === "split") {
      expect(s.layout.primary.tabs).not.toContain("schema");
      expect(s.layout.secondary.tabs).toContain("schema");
    }
  });

  it("moveTab collapses to single when source group's last tab is dragged out", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    useEditorStore.getState().moveTab("relationships", "g1");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    if (s.layout.kind === "single") {
      expect(s.layout.group.tabs).toContain("relationships");
    }
  });

  it("moveTab from secondary to primary keeps the moved tab visible after collapse", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    // drop "relationships" before "schema" in primary
    useEditorStore.getState().moveTab("relationships", "g1", "schema");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    if (s.layout.kind === "single") {
      expect(s.layout.group.tabs).toContain("relationships");
      expect(s.layout.group.activeTab).toBe("relationships");
    }
    expect(s.closedPool).not.toContain("relationships");
  });

  it("moveTab to a non-existent group recovers the orphaned tab into closedPool", () => {
    // After a move-and-collapse, the surviving group is always "g1". A
    // bubbled-up duplicate drop event can target the now-defunct "g2", which
    // would otherwise leave the tab in neither a group nor closedPool. The
    // reconciler must recover it so the user can reopen it from the menu.
    useEditorStore.getState().splitTab("relationships", "horizontal");
    useEditorStore.getState().moveTab("relationships", "g1");
    expect(useEditorStore.getState().layout.kind).toBe("single");

    useEditorStore.getState().moveTab("relationships", "g2");
    const s = useEditorStore.getState();
    const inGroup =
      s.layout.kind === "single" && s.layout.group.tabs.includes("relationships");
    const inClosedPool = s.closedPool.includes("relationships");
    expect(inGroup || inClosedPool).toBe(true);
  });

  it("showDocument opens a closed-pool doc into a new horizontal secondary group", () => {
    useEditorStore.getState().showDocument("visualizer");
    const s = useEditorStore.getState();
    expect(s.closedPool).not.toContain("visualizer");
    expect(s.layout.kind).toBe("split");
    if (s.layout.kind === "split") {
      expect(s.layout.direction).toBe("horizontal");
      expect(s.layout.primary.tabs).toEqual(["schema", "relationships", "assertions", "expected"]);
      expect(s.layout.secondary.tabs).toEqual(["visualizer"]);
      expect(s.layout.secondary.activeTab).toBe("visualizer");
    }
  });

  it("showDocument opens a closed-pool doc into the existing secondary group", () => {
    useEditorStore.getState().splitTab("relationships", "horizontal");
    useEditorStore.getState().showDocument("visualizer");
    const s = useEditorStore.getState();
    expect(s.closedPool).not.toContain("visualizer");
    if (s.layout.kind === "split") {
      expect(s.layout.secondary.tabs).toContain("visualizer");
      expect(s.layout.secondary.activeTab).toBe("visualizer");
      expect(s.layout.primary.tabs).not.toContain("visualizer");
    }
  });

  it("showDocument activates the doc in place when it's already in a group", () => {
    useEditorStore.getState().openInGroup("visualizer", "g1");
    useEditorStore.getState().setActiveTab("g1", "schema");
    useEditorStore.getState().showDocument("visualizer");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    if (s.layout.kind === "single") {
      expect(s.layout.group.activeTab).toBe("visualizer");
    }
  });

  it("reconcileTabs recovers orphaned tabs that are missing from groups and closedPool", () => {
    // Construct a corrupt state directly: a tab that is in neither a group
    // nor the closedPool. The next mutation must reconcile it back.
    useEditorStore.setState({
      layout: {
        kind: "single",
        group: { id: "g1", tabs: ["schema"], activeTab: "schema" },
      },
      closedPool: [],
    });
    // Trigger any action — setActiveTab is a no-op-ish action that still runs
    // through the reconciler.
    useEditorStore.getState().setActiveTab("g1", "schema");
    const s = useEditorStore.getState();
    expect(s.closedPool).toContain("relationships");
    expect(s.closedPool).toContain("assertions");
    expect(s.closedPool).toContain("expected");
    expect(s.closedPool).toContain("visualizer");
  });

  it("moveTab from primary's only tab to secondary keeps the moved tab visible", () => {
    // Set up: g1 = [schema], g2 = [relationships, assertions, expected]
    useEditorStore.getState().splitTab("schema", "horizontal");
    // After splitTab("schema", ...), primary holds the rest, secondary holds schema.
    // Move two more tabs to secondary so primary ends up with one tab.
    useEditorStore.getState().moveTab("assertions", "g2");
    useEditorStore.getState().moveTab("expected", "g2");
    // Now primary should have only [relationships], secondary has [schema, assertions, expected]
    const before = useEditorStore.getState();
    expect(before.layout.kind).toBe("split");
    if (before.layout.kind === "split") {
      expect(before.layout.primary.tabs).toEqual(["relationships"]);
    }

    // Drag the last tab from primary into secondary
    useEditorStore.getState().moveTab("relationships", "g2");
    const s = useEditorStore.getState();
    expect(s.layout.kind).toBe("single");
    if (s.layout.kind === "single") {
      expect(s.layout.group.tabs).toContain("relationships");
    }
    expect(s.closedPool).not.toContain("relationships");
  });
});
