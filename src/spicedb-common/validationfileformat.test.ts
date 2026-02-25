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
});
