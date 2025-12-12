import { describe, it, expect } from "vitest";
import { LoadExamples } from "./examples";

describe("LoadExamples", () => {
  it("should correctly parse and return examples and skip those that are missing files", () => {
    const examples = LoadExamples();

    expect(examples).toHaveLength(6);

    examples.forEach(function (example) {
      expect(example.id).not.toBeNull();
      expect(example.title).not.toBeNull();
      expect(example.subtitle).not.toBeNull();
      expect(example.data).not.toBeNull();
      expect(example.data.schema).not.toBeNull();
      expect(example.data.relationships).not.toBeNull();
      expect(example.data.assertions).not.toBeNull();
    });
  });
});
