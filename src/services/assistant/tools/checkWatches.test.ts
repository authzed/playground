import { describe, expect, it, vi } from "vitest";

import { LiveCheckItemStatus } from "../../check";
import { NOOP_HISTORY, type ToolContext } from "../types";

import {
  addCheckWatchTool,
  listCheckWatchesTool,
  removeCheckWatchTool,
  updateCheckWatchTool,
} from "./checkWatches";

function makeCtx() {
  const items: any[] = [
    {
      id: "w1",
      object: "document:readme",
      action: "view",
      subject: "user:alice",
      context: "",
      status: LiveCheckItemStatus.FOUND,
    },
  ];
  const liveCheckService = {
    items,
    addWatch: vi.fn((w: any) => {
      const id = "w2";
      items.push({ id, ...w, status: LiveCheckItemStatus.NOT_CHECKED });
      return id;
    }),
    itemUpdated: vi.fn(),
    removeItem: vi.fn((it: any) => {
      const i = items.indexOf(it);
      if (i >= 0) items.splice(i, 1);
    }),
  };
  const openWatchesPanel = vi.fn();
  const dev = {
    newRequest: () => ({
      schemaWarnings: () => {},
      check: (_p: unknown, cb: (r: any) => void) => cb({ membership: 2 }),
      execute: () => ({}),
    }),
  };
  const ctx: ToolContext = {
    datastore: { getSingletonByKind: () => ({ editableContents: "" }) } as any,
    getServices: () => ({ liveCheckService, developerService: dev }) as any,
    reveal: vi.fn(),
    openDocument: vi.fn(),
    openWatchesPanel,
    history: NOOP_HISTORY,
  };
  return { ctx, items, liveCheckService, openWatchesPanel };
}

describe("check-watch tools", () => {
  it("lists watches with labels", async () => {
    const { ctx } = makeCtx();
    const out = (await listCheckWatchesTool.execute({}, ctx)) as any;
    expect(out.watches[0]).toMatchObject({
      watch_id: "w1",
      resource: "document:readme",
      status: "allowed",
    });
  });

  it("adds a watch, opens the panel, and returns the immediate result", async () => {
    const { ctx, liveCheckService, openWatchesPanel } = makeCtx();
    const out = (await addCheckWatchTool.execute(
      { resource: "doc:1", permission: "view", subject: "user:bob" },
      ctx,
    )) as any;
    expect(openWatchesPanel).toHaveBeenCalled();
    expect(liveCheckService.addWatch).toHaveBeenCalled();
    expect(out.watch_id).toBe("w2");
    expect(out.current_result).toBe("allowed");
  });

  it("updates a watch by id in place", async () => {
    const { ctx, items, liveCheckService } = makeCtx();
    const out = (await updateCheckWatchTool.execute(
      { watch_id: "w1", permission: "edit" },
      ctx,
    )) as any;
    expect(out.ok).toBe(true);
    expect(items.find((i: any) => i.id === "w1").action).toBe("edit");
    expect(liveCheckService.itemUpdated).toHaveBeenCalled();
  });
  it("returns an error for an unknown id on update", async () => {
    const { ctx } = makeCtx();
    const out = (await updateCheckWatchTool.execute(
      { watch_id: "nope", permission: "x" },
      ctx,
    )) as any;
    expect(out.ok).toBe(false);
  });

  it("removes a watch by id", async () => {
    const { ctx, items } = makeCtx();
    const out = (await removeCheckWatchTool.execute({ watch_id: "w1" }, ctx)) as any;
    expect(out.ok).toBe(true);
    expect(items.find((i) => i.id === "w1")).toBeUndefined();
  });

  it("returns an error for an unknown watch id", async () => {
    const { ctx } = makeCtx();
    const out = (await removeCheckWatchTool.execute({ watch_id: "nope" }, ctx)) as any;
    expect(out.ok).toBe(false);
  });
});
