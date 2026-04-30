import { describe, it, expect } from "vitest";

import { parseValidationYAML } from "./validationfileformat";

describe("parsing validation YAML", () => {
  it("returns undefined for an empty file", () => {
    expect(parseValidationYAML("")).toEqual({
      message: "data must be object",
    });
  });

  it("returns undefined for an invalid file", () => {
    expect(parseValidationYAML("sdfdsfsdf")).toEqual({
      message: "data must be object",
    });
  });

  it("returns undefined for a file missing schema", () => {
    expect(parseValidationYAML("schema: null")).toEqual({
      message: "data must have required property 'relationships'",
    });
  });

  it("returns undefined for a file missing relationships", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: null    
`),
    ).toEqual({
      message: "data/relationships must be string",
    });
  });

  it("returns properly for null assertions", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
assertions: null    
`),
    ).toHaveProperty("schema");
  });

  it("returns properly for missing assertions", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
`),
    ).toHaveProperty("schema");
  });

  it("returns properly for null validation", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
assertions: {}
validation: null    
`),
    ).toHaveProperty("schema");
  });

  it("returns properly for missing validation", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
assertions: {}
`),
    ).toHaveProperty("schema");
  });

  it("returns properly for invalid assertions", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
assertions: invalid
`),
    ).toEqual({ message: "data/assertions must be object,null" });
  });

  it("returns properly for invalid assertions list", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
assertions: []
`),
    ).toEqual({ message: "data/assertions must be object,null" });
  });

  it("returns properly for invalid validation", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
validation: invalid
`),
    ).toEqual({ message: "data/validation must be object,null" });
  });

  it("returns properly for fully valid", () => {
    const parsed = parseValidationYAML(`schema: hi
relationships: hello
assertions: {}
validation: {}
    `);
    expect(parsed).toHaveProperty("schema");
  });

  it("returns properly with checkWatches populated", () => {
    const parsed = parseValidationYAML(`schema: hi
relationships: hello
checkWatches:
  - object: document:firstdoc
    action: view
    subject: user:tom
    context: ""
`);
    expect(parsed).toEqual({
      schema: "hi",
      relationships: "hello",
      checkWatches: [
        {
          object: "document:firstdoc",
          action: "view",
          subject: "user:tom",
          context: "",
        },
      ],
    });
  });

  it("returns properly without checkWatches (undefined)", () => {
    const parsed = parseValidationYAML(`schema: hi
relationships: hello
`);
    expect(parsed).toHaveProperty("schema");
    expect((parsed as { checkWatches?: unknown }).checkWatches).toBeUndefined();
  });

  it("rejects checkWatches with a non-string field", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
checkWatches:
  - object: document:firstdoc
    action: 5
    subject: user:tom
`),
    ).toEqual({ message: "data/checkWatches/0/action must be string" });
  });

  it("rejects checkWatches missing a required field", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
checkWatches:
  - object: document:firstdoc
    subject: user:tom
`),
    ).toEqual({ message: "data/checkWatches/0 must have required property 'action'" });
  });

  it("rejects checkWatches that is not an array", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
checkWatches: notalist
`),
    ).toEqual({ message: "data/checkWatches must be array" });
  });
});
