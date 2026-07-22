import { beforeEach, describe, expect, it } from "vitest";

import { useHistoryStore } from "./historyStore";
import type { HistoryDocs } from "./types";

const docs = (schema: string): HistoryDocs => ({
  schema,
  relationships: "",
  assertions: "",
  expected: "",
});

describe("useHistoryStore", () => {
  beforeEach(() => useHistoryStore.getState().clear());

  it("records a revision and returns its id", () => {
    const id = useHistoryStore.getState().record({ source: "ai", label: "x", docs: docs("a") });
    expect(useHistoryStore.getState().get(id)?.docs.schema).toBe("a");
  });

  it("dedups an identical consecutive snapshot", () => {
    useHistoryStore.getState().record({ source: "manual", docs: docs("a") });
    useHistoryStore.getState().record({ source: "manual", docs: docs("a") });
    expect(useHistoryStore.getState().revisions).toHaveLength(1);
  });

  it("caps at 30 revisions", () => {
    for (let i = 0; i < 35; i++)
      useHistoryStore.getState().record({ source: "manual", docs: docs(`s${i}`) });
    expect(useHistoryStore.getState().revisions).toHaveLength(30);
    expect(useHistoryStore.getState().revisions[0].docs.schema).toBe("s5");
  });
});
