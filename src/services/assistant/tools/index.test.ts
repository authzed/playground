import { describe, expect, it } from "vitest";

import { CLIENT_TOOL_NAMES, TOOL_DISPLAY, buildDefaultRegistry } from "./index";

describe("buildDefaultRegistry", () => {
  it("registers all nine client tools", () => {
    const names = buildDefaultRegistry()
      .list()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual(
      [
        "add_check_watch",
        "edit_document",
        "explain_check",
        "list_check_watches",
        "open_tab_to_line",
        "remove_check_watch",
        "run_check",
        "run_validation",
        "update_check_watch",
      ].sort(),
    );
    expect(CLIENT_TOOL_NAMES).toContain("edit_document");
  });
});

describe("TOOL_DISPLAY", () => {
  it("exposes a present-progressive progress label for every client tool", () => {
    for (const name of CLIENT_TOOL_NAMES) {
      expect(TOOL_DISPLAY[name].progress).toMatch(/ing\b/);
    }
  });

  it("keeps the imperative label distinct from the progress label", () => {
    // The chip shows the imperative form; the status line shows the gerund.
    expect(TOOL_DISPLAY.edit_document.label).toBe("Edit document");
    expect(TOOL_DISPLAY.edit_document.progress).toBe("Editing document");
  });
});
