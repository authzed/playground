import { describe, expect, it } from "vitest";

import { CLIENT_TOOL_NAMES, buildDefaultRegistry } from "./index";

describe("buildDefaultRegistry", () => {
  it("registers all eight client tools", () => {
    const names = buildDefaultRegistry()
      .list()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual(
      [
        "add_check_watch",
        "edit_document",
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
