// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { useSchemaJumpStore } from "./schema-jump";
import { useEditorStore } from "./state";

describe("schema jump store", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    localStorage.removeItem("playground-editor-state");
    useSchemaJumpStore.getState().consumeReveal();
  });

  it("starts with no pending reveal", () => {
    expect(useSchemaJumpStore.getState().pendingReveal).toBeUndefined();
  });

  it("jumpToSchema records the location and activates the schema document", () => {
    // Move schema out of the active slot first so we can prove it gets activated.
    useEditorStore.getState().setActiveTab("g1", "relationships");
    useSchemaJumpStore.getState().jumpToSchema(7, 3);

    expect(useSchemaJumpStore.getState().pendingReveal).toEqual({ line: 7, column: 3 });
    const layout = useEditorStore.getState().layout;
    expect(layout.kind === "single" && layout.group.activeTab).toBe("schema");
  });

  it("consumeReveal clears the pending reveal", () => {
    useSchemaJumpStore.getState().jumpToSchema(1, 1);
    useSchemaJumpStore.getState().consumeReveal();
    expect(useSchemaJumpStore.getState().pendingReveal).toBeUndefined();
  });
});
