import { describe, expect, it } from "vitest";

import { reconcileGeneratingStatus } from "./toggleLogic";

describe("reconcileGeneratingStatus", () => {
  it("is a no-op when we are not generating", () => {
    expect(reconcileGeneratingStatus("idle", "streaming", true)).toEqual({
      status: "idle",
      sawBusy: false,
    });
    expect(reconcileGeneratingStatus("error", "idle", true)).toEqual({
      status: "error",
      sawBusy: false,
    });
  });

  it("keeps generating while the turn has not started yet (race case)", () => {
    expect(reconcileGeneratingStatus("generating", "idle", false)).toEqual({
      status: "generating",
      sawBusy: false,
    });
  });

  it("stays generating and records busy once the assistant is streaming", () => {
    expect(reconcileGeneratingStatus("generating", "streaming", false)).toEqual({
      status: "generating",
      sawBusy: true,
    });
  });

  it("stays generating and records busy once the assistant is executing tools", () => {
    expect(reconcileGeneratingStatus("generating", "executing_tools", false)).toEqual({
      status: "generating",
      sawBusy: true,
    });
  });

  it("clears to idle when the turn finished (was busy, now idle)", () => {
    expect(reconcileGeneratingStatus("generating", "idle", true)).toEqual({
      status: "idle",
      sawBusy: false,
    });
  });

  it("flags error when the turn errored after having run", () => {
    expect(reconcileGeneratingStatus("generating", "error", true)).toEqual({
      status: "error",
      sawBusy: false,
    });
  });

  it("stays generating on a pre-existing assistant error before our turn ran", () => {
    expect(reconcileGeneratingStatus("generating", "error", false)).toEqual({
      status: "generating",
      sawBusy: false,
    });
  });
});
