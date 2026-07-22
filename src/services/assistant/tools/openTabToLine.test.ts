import { describe, expect, it, vi } from "vitest";

import { DataStoreItemKind } from "../../datastore";
import { NOOP_HISTORY, type ToolContext } from "../types";

import { openTabToLineTool } from "./openTabToLine";

describe("openTabToLineTool", () => {
  it("opens the document and requests a reveal at the line", async () => {
    const openDocument = vi.fn();
    const reveal = vi.fn();
    const ctx: ToolContext = {
      datastore: {} as any,
      getServices: () => ({}) as any,
      reveal,
      openDocument,
      openWatchesPanel: vi.fn(),
      history: NOOP_HISTORY,
    };
    const out = (await openTabToLineTool.execute({ target: "schema", line: 12 }, ctx)) as any;
    expect(out.ok).toBe(true);
    expect(openDocument).toHaveBeenCalledWith("schema");
    expect(reveal).toHaveBeenCalledWith(DataStoreItemKind.SCHEMA, {
      startLine: 12,
      startColumn: undefined,
      endLine: undefined,
      endColumn: undefined,
    });
  });
});
