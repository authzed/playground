import { describe, expect, it, vi } from "vitest";

import { NOOP_HISTORY, type ToolContext } from "../types";

import { runCheckTool } from "./runCheck";
import { runValidationTool } from "./runValidation";

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

describe("runCheckTool", () => {
  it("delegates to the shared runner and returns allowed for MEMBER", async () => {
    const dev = {
      newRequest: () => ({
        schemaWarnings: () => {},
        check: (_p: unknown, cb: (r: any) => void) => cb({ membership: 2 }),
        execute: () => ({}),
      }),
    };
    const out = (await runCheckTool.execute(
      { resource: "document:readme", permission: "view", subject: "user:alice" },
      ctxWithDev(dev),
    )) as any;
    expect(out.result).toBe("allowed");
  });
});

describe("runValidationTool", () => {
  it("returns passed=true when there are no failures", async () => {
    const dev = {
      newRequest: () => ({
        schemaWarnings: () => {},
        runAssertions: (_y: string, cb: (r: any) => void) => cb({ validationErrors: [] }),
        runValidation: (_y: string, cb: (r: any) => void) =>
          cb({ updatedValidationYaml: "", validationErrors: [] }),
        execute: () => ({}),
      }),
    };
    const out = (await runValidationTool.execute({}, ctxWithDev(dev))) as any;
    expect(out.passed).toBe(true);
  });
});
