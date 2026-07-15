import { describe, expect, it, vi } from "vitest";

import { NOOP_HISTORY, type ToolContext } from "../types";

import { explainCheckTool } from "./explainCheck";

function ctxWithDev(dev: unknown): ToolContext {
  return {
    datastore: { getSingletonByKind: () => ({ editableContents: "" }) } as any,
    getServices: () => ({ developerService: dev }) as any,
    reveal: vi.fn(),
    openDocument: vi.fn(),
    openWatchesPanel: vi.fn(),
    history: NOOP_HISTORY,
  };
}

const trace = {
  resource: { objectType: "document", objectId: "readme" },
  permission: "view",
  permissionType: 2, // PERMISSION
  result: 2, // HAS_PERMISSION
  resolution: { case: undefined },
};

function devWithTrace() {
  return {
    newRequest: () => ({
      schemaWarnings: () => {},
      check: (_p: unknown, cb: (r: any) => void) =>
        cb({ membership: 2, resolvedDebugInformation: { check: trace } }),
      execute: () => ({}),
    }),
  };
}

describe("explainCheckTool", () => {
  it("returns the result plus a text explanation and the structured trace", async () => {
    const result = (await explainCheckTool.execute(
      { resource: "document:readme", permission: "view", subject: "user:alice" },
      ctxWithDev(devWithTrace()),
    )) as any;
    expect(result.result).toBe("allowed");
    expect(result.explanation).toContain("document:readme#view");
    expect(result.explanation).toContain("allowed");
    expect(result.trace).toBe(trace);
  });

  it("render() produces a trace artifact and redactFromModel hides the raw trace", async () => {
    const result = (await explainCheckTool.execute(
      { resource: "document:readme", permission: "view", subject: "user:alice" },
      ctxWithDev(devWithTrace()),
    )) as any;
    expect(explainCheckTool.render?.(result, {} as any, ctxWithDev(devWithTrace()))).toEqual({
      kind: "trace",
      trace,
    });
    expect(explainCheckTool.redactFromModel).toContain("trace");
  });
});
