import { describe, it, expect } from "vitest";

import { parseValidationYAML } from "./validationfileformat";

describe("parsing validation YAML", () => {
  it("returns properly for missing assertions", () => {
    expect(
      parseValidationYAML(`schema: hi
relationships: hello
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
});
