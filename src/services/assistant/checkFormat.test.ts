import { describe, expect, it } from "vitest";

import { LiveCheckItemStatus } from "../check";

import { checkInputToWatch, statusLabel } from "./checkFormat";

describe("checkInputToWatch", () => {
  it("maps SpiceDB-idiomatic input to a CheckWatch", () => {
    expect(
      checkInputToWatch({ resource: "document:readme", permission: "view", subject: "user:alice" }),
    ).toEqual({ object: "document:readme", action: "view", subject: "user:alice", context: "" });
  });
  it("carries caveat_context into context", () => {
    expect(
      checkInputToWatch({
        resource: "d:1",
        permission: "v",
        subject: "u:a",
        caveat_context: "ip:1",
      }).context,
    ).toBe("ip:1");
  });
});

describe("statusLabel", () => {
  it("maps engine statuses to labels", () => {
    expect(statusLabel(LiveCheckItemStatus.FOUND)).toBe("allowed");
    expect(statusLabel(LiveCheckItemStatus.NOT_FOUND)).toBe("denied");
    expect(statusLabel(LiveCheckItemStatus.CAVEATED)).toBe("conditional");
    expect(statusLabel(LiveCheckItemStatus.INVALID)).toBe("invalid");
    expect(statusLabel(LiveCheckItemStatus.NOT_VALID)).toBe("invalid");
    expect(statusLabel(LiveCheckItemStatus.NOT_CHECKED)).toBe("not_checked");
  });
});
