import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataStoreItemKind } from "../../datastore";
import { useSchemaAnnotationStore } from "../../schemaAnnotations/store";
import { NOOP_HISTORY, type ToolContext } from "../types";

import { explainSchemaTool } from "./explainSchema";

const SCHEMA = `definition user {}

definition document {
	relation viewer: user
	permission view = viewer
}`;

function ctxWith(schema: string): ToolContext {
  const item = {
    id: "s",
    kind: DataStoreItemKind.SCHEMA,
    pathname: "schema",
    editableContents: schema,
  };
  return {
    datastore: { getSingletonByKind: () => item, update: vi.fn() } as any,
    getServices: () => ({}) as any,
    reveal: vi.fn(),
    openDocument: vi.fn(),
    openWatchesPanel: vi.fn(),
    history: NOOP_HISTORY,
  };
}

describe("explainSchemaTool", () => {
  beforeEach(() => useSchemaAnnotationStore.getState().reset());

  it("writes resolved annotations to the store and switches density", async () => {
    const res = await explainSchemaTool.execute(
      {
        show: "full",
        annotations: [
          {
            symbolKind: "definition",
            symbolPath: "document",
            shortLabel: "core resource",
            explanation: "The document resource.",
          },
          {
            symbolKind: "permission",
            symbolPath: "document/view",
            shortLabel: "viewers can view",
            explanation: "Anyone who is a viewer can view.",
          },
        ],
      },
      ctxWith(SCHEMA),
    );

    expect(res.ok).toBe(true);
    expect(res.explained_count).toBe(2);
    const stored = useSchemaAnnotationStore.getState();
    expect(stored.annotations).toHaveLength(2);
    expect(stored.toggleState).toBe("full");
    // sourceHash must be populated so staleness works later.
    expect(stored.annotations[0].sourceHash).toBeTruthy();
  });

  describe("density after generating", () => {
    const entries = [
      { symbolKind: "definition", symbolPath: "document", shortLabel: "core", explanation: "z" },
    ] as const;

    it("keeps Compact when the user turned it on before generating", async () => {
      useSchemaAnnotationStore.getState().setToggleState("compact");
      await explainSchemaTool.execute({ annotations: [...entries] }, ctxWith(SCHEMA));
      expect(useSchemaAnnotationStore.getState().toggleState).toBe("compact");
    });

    it("keeps the user's density even if the model passes a different `show`", async () => {
      useSchemaAnnotationStore.getState().setToggleState("compact");
      await explainSchemaTool.execute({ show: "full", annotations: [...entries] }, ctxWith(SCHEMA));
      expect(useSchemaAnnotationStore.getState().toggleState).toBe("compact");
    });

    it("keeps Full when the user is already on Full", async () => {
      useSchemaAnnotationStore.getState().setToggleState("full");
      await explainSchemaTool.execute(
        { show: "compact", annotations: [...entries] },
        ctxWith(SCHEMA),
      );
      expect(useSchemaAnnotationStore.getState().toggleState).toBe("full");
    });

    it("turns explanations on (default Full) when they were hidden", async () => {
      await explainSchemaTool.execute({ annotations: [...entries] }, ctxWith(SCHEMA));
      expect(useSchemaAnnotationStore.getState().toggleState).toBe("full");
    });

    it("honors `show` when explanations were hidden", async () => {
      await explainSchemaTool.execute(
        { show: "compact", annotations: [...entries] },
        ctxWith(SCHEMA),
      );
      expect(useSchemaAnnotationStore.getState().toggleState).toBe("compact");
    });
  });

  it("skips unknown symbols but keeps valid ones", async () => {
    const res = await explainSchemaTool.execute(
      {
        annotations: [
          { symbolKind: "definition", symbolPath: "ghost", shortLabel: "x", explanation: "y" },
          {
            symbolKind: "definition",
            symbolPath: "document",
            shortLabel: "core",
            explanation: "z",
          },
        ],
      },
      ctxWith(SCHEMA),
    );
    expect(res.explained_count).toBe(1);
    expect(res.unknown_symbols).toEqual(["ghost"]);
    expect(useSchemaAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it("does not wipe prior annotations when every symbol is unknown", async () => {
    // Seed the store with a prior explanation set.
    useSchemaAnnotationStore.getState().setAnnotations(
      [
        {
          symbolKind: "definition",
          symbolPath: "document",
          shortLabel: "core",
          explanation: "The document resource.",
          sourceHash: "seed",
        },
      ],
      "full",
    );

    const res = await explainSchemaTool.execute(
      {
        annotations: [
          { symbolKind: "definition", symbolPath: "ghost", shortLabel: "x", explanation: "y" },
        ],
      },
      ctxWith(SCHEMA),
    );

    expect(res).toEqual({ ok: false, explained_count: 0, unknown_symbols: ["ghost"] });
    // Prior annotations survive and the density toggle is untouched.
    const stored = useSchemaAnnotationStore.getState();
    expect(stored.annotations).toHaveLength(1);
    expect(stored.annotations[0].symbolPath).toBe("document");
    expect(stored.toggleState).toBe("full");
  });
});
