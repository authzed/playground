import { describe, expect, it, vi } from "vitest";

import { DataStoreItemKind } from "../../datastore";
import { NOOP_HISTORY, type ToolContext } from "../types";

import { editDocumentTool } from "./editDocument";

function ctxWith(schema: string) {
  const item = {
    id: "s",
    kind: DataStoreItemKind.SCHEMA,
    pathname: "schema",
    editableContents: schema,
  };
  const update = vi.fn((_it, next: string) => (item.editableContents = next));
  const ctx: ToolContext = {
    datastore: { getSingletonByKind: () => item, update } as any,
    getServices: () => ({}) as any,
    reveal: vi.fn(),
    openDocument: vi.fn(),
    openWatchesPanel: vi.fn(),
    history: NOOP_HISTORY,
  };
  return { ctx, item, update };
}

describe("editDocumentTool", () => {
  it("applies a unique str_replace", async () => {
    const { ctx, item, update } = ctxWith("definition user {}\n");
    const res = await editDocumentTool.execute(
      {
        target: "schema",
        op: "str_replace",
        old_string: "definition user {}",
        new_string: "definition user {}\ndefinition doc {}",
      },
      ctx,
    );
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalled();
    expect(item.editableContents).toContain("definition doc {}");
  });

  it("fails when str_replace matches zero times", async () => {
    const { ctx, update } = ctxWith("definition user {}\n");
    const res = await editDocumentTool.execute(
      { target: "schema", op: "str_replace", old_string: "nope", new_string: "x" },
      ctx,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("0");
    expect(update).not.toHaveBeenCalled();
  });

  it("fails when str_replace matches multiple times", async () => {
    const { ctx, update } = ctxWith("a\na\n");
    const res = await editDocumentTool.execute(
      { target: "schema", op: "str_replace", old_string: "a", new_string: "b" },
      ctx,
    );
    expect(res.ok).toBe(false);
    expect(res.match_count).toBe(2);
    expect(update).not.toHaveBeenCalled();
  });

  it("writes a whole document", async () => {
    const { ctx, item } = ctxWith("old");
    const res = await editDocumentTool.execute(
      { target: "schema", op: "write", content: "new content" },
      ctx,
    );
    expect(res.ok).toBe(true);
    expect(item.editableContents).toBe("new content");
  });

  it("fails a write with no content instead of wiping the document", async () => {
    const { ctx, item, update } = ctxWith("original schema");
    const res = await editDocumentTool.execute({ target: "schema", op: "write" }, ctx);
    expect(res.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(item.editableContents).toBe("original schema");
  });
});
