import { beforeEach, describe, expect, it } from "vitest";

import { hashSymbolSource } from "./resolve";
import { useSchemaAnnotationStore } from "./store";

describe("useSchemaAnnotationStore", () => {
  beforeEach(() => useSchemaAnnotationStore.getState().reset());

  it("starts off with no annotations", () => {
    const s = useSchemaAnnotationStore.getState();
    expect(s.toggleState).toBe("off");
    expect(s.annotations).toEqual([]);
    expect(s.status).toBe("idle");
  });

  it("setAnnotations stores items, clears status, and can switch density", () => {
    useSchemaAnnotationStore.getState().setStatus("generating");
    useSchemaAnnotationStore.getState().setAnnotations(
      [
        {
          symbolKind: "definition",
          symbolPath: "document",
          shortLabel: "core resource",
          explanation: "The document resource.",
          sourceHash: hashSymbolSource("definition document {}"),
        },
      ],
      "full",
    );
    const s = useSchemaAnnotationStore.getState();
    expect(s.annotations).toHaveLength(1);
    expect(s.toggleState).toBe("full");
    expect(s.status).toBe("idle");
  });

  it("setStatus records an error message", () => {
    useSchemaAnnotationStore.getState().setStatus("error", "boom");
    const s = useSchemaAnnotationStore.getState();
    expect(s.status).toBe("error");
    expect(s.errorMessage).toBe("boom");
  });
});
