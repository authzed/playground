import { describe, expect, it } from "vitest";

import { DataStoreItemKind } from "../../services/datastore";

import { useRevealStore } from "./revealStore";

describe("useRevealStore", () => {
  it("stores a reveal request with an incrementing nonce", () => {
    const { requestReveal } = useRevealStore.getState();
    requestReveal(DataStoreItemKind.SCHEMA, { startLine: 12 });
    const first = useRevealStore.getState().request!;
    expect(first.kind).toBe(DataStoreItemKind.SCHEMA);
    expect(first.range.startLine).toBe(12);

    requestReveal(DataStoreItemKind.SCHEMA, { startLine: 12 });
    expect(useRevealStore.getState().request!.nonce).toBeGreaterThan(first.nonce);
  });
});
