import { describe, expect, it } from "vitest";

import { assertionStringToCheckWatch } from "./check";

describe("assertionStringToCheckWatch", () => {
  it("parses a simple assertion", () => {
    expect(assertionStringToCheckWatch("document:firstdoc#view@user:fred")).toEqual({
      object: "document:firstdoc",
      action: "view",
      subject: "user:fred",
      context: "",
    });
  });

  it("strips a trailing #... on the subject", () => {
    expect(assertionStringToCheckWatch("document:firstdoc#view@user:fred#...")).toEqual({
      object: "document:firstdoc",
      action: "view",
      subject: "user:fred",
      context: "",
    });
  });

  it("preserves a non-trivial subject relation", () => {
    expect(assertionStringToCheckWatch("document:firstdoc#view@team:eng#member")).toEqual({
      object: "document:firstdoc",
      action: "view",
      subject: "team:eng#member",
      context: "",
    });
  });

  it("extracts a caveat context", () => {
    expect(
      assertionStringToCheckWatch('document:firstdoc#view@user:fred[some_caveat:{"hour":12}]'),
    ).toEqual({
      object: "document:firstdoc",
      action: "view",
      subject: "user:fred",
      context: 'some_caveat:{"hour":12}',
    });
  });

  it("returns undefined for malformed strings", () => {
    expect(assertionStringToCheckWatch("")).toBeUndefined();
    expect(assertionStringToCheckWatch("not-a-relationship")).toBeUndefined();
    expect(assertionStringToCheckWatch("document:firstdoc")).toBeUndefined();
    expect(assertionStringToCheckWatch("document:firstdoc#view")).toBeUndefined();
    expect(assertionStringToCheckWatch("#view@user:fred")).toBeUndefined();
  });
});
