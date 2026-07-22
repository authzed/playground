import { describe, expect, it } from "vitest";

import { DeveloperError_Source } from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { LiveCheckItemStatus } from "../check";

import { buildCheckWatchPrompt, buildErrorPrompt, isDebuggableWatchStatus } from "./debugPrompts";

describe("buildErrorPrompt", () => {
  it("phrases a schema error with line and context", () => {
    const p = buildErrorPrompt({
      source: DeveloperError_Source.SCHEMA,
      line: 4,
      message: "expected type",
      context: "viewer",
    });
    expect(p).toContain("schema");
    expect(p).toContain("line 4");
    expect(p).toContain("expected type");
    expect(p).toContain("viewer");
    expect(p.toLowerCase()).toContain("fix");
  });

  it("phrases an assertion failure using the assertion string in context", () => {
    const p = buildErrorPrompt({
      source: DeveloperError_Source.ASSERTION,
      line: 0,
      message: "expected allowed but got denied",
      context: "document:budget#view@user:tim",
    });
    expect(p).toContain("assertion");
    expect(p).toContain("document:budget#view@user:tim");
    expect(p).toContain("expected allowed but got denied");
  });

  it("omits the line clause when line is 0", () => {
    const p = buildErrorPrompt({
      source: DeveloperError_Source.SCHEMA,
      line: 0,
      message: "boom",
      context: "",
    });
    expect(p).not.toContain("line 0");
  });

  it("phrases a validation error", () => {
    const p = buildErrorPrompt({
      source: DeveloperError_Source.VALIDATION_YAML,
      line: 3,
      message: "unexpected relation",
      context: "",
    });
    expect(p.toLowerCase()).toContain("validation");
    expect(p).toContain("line 3");
    expect(p).toContain("unexpected relation");
  });

  it("phrases a relationship error", () => {
    const p = buildErrorPrompt({
      source: DeveloperError_Source.RELATIONSHIP,
      line: 2,
      message: "invalid tuple",
      context: "document:x#viewer@user:y",
    });
    expect(p.toLowerCase()).toContain("relationship");
    expect(p).toContain("invalid tuple");
  });
});

describe("buildCheckWatchPrompt", () => {
  it("describes a denied (NOT_FOUND) check", () => {
    const p = buildCheckWatchPrompt({
      object: "document:budget",
      action: "view",
      subject: "user:tim",
      context: "",
      status: LiveCheckItemStatus.NOT_FOUND,
    });
    expect(p).toContain("document:budget#view@user:tim");
    expect(p.toLowerCase()).toContain("denied");
    expect(p.toLowerCase()).toContain("debug");
  });

  it("includes the error message for INVALID checks", () => {
    const p = buildCheckWatchPrompt({
      object: "document:x",
      action: "edit",
      subject: "user:sam",
      context: "",
      status: LiveCheckItemStatus.INVALID,
      errorMessage: "unknown relation edit",
    });
    expect(p).toContain("unknown relation edit");
  });

  it("mentions missing context for CAVEATED checks", () => {
    const p = buildCheckWatchPrompt({
      object: "document:y",
      action: "view",
      subject: "user:kim",
      context: "",
      status: LiveCheckItemStatus.CAVEATED,
    });
    expect(p.toLowerCase()).toContain("context");
  });
});

describe("isDebuggableWatchStatus", () => {
  it("is true for non-passing, non-pending statuses", () => {
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.NOT_FOUND)).toBe(true);
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.INVALID)).toBe(true);
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.NOT_VALID)).toBe(true);
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.CAVEATED)).toBe(true);
  });

  it("is false for passing and pending statuses", () => {
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.FOUND)).toBe(false);
    expect(isDebuggableWatchStatus(LiveCheckItemStatus.NOT_CHECKED)).toBe(false);
  });
});
