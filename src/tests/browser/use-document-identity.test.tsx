import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { DataStoreItemKind, EphemeralDataStore } from "@/services/datastore";
import { useDocumentIdentity } from "@/hooks/use-document-identity";

describe("useDocumentIdentity", () => {
  it("returns 'untitled' when no baseline is set", async () => {
    const store = new EphemeralDataStore();
    const { result } = await renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current.kind).toBe("untitled");
  });

  it("returns 'example' when an example is loaded", async () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "doc-sharing");
    const { result } = await renderHook(() =>
      useDocumentIdentity(store, (id) => (id === "doc-sharing" ? "Document Sharing" : undefined)),
    );
    expect(result.current).toEqual({
      kind: "example",
      name: "Document Sharing",
      modified: false,
    });
  });

  it("falls back to identifier when name lookup returns undefined", async () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "unknown-id");
    const { result } = await renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current).toEqual({
      kind: "example",
      name: "unknown-id",
      modified: false,
    });
  });

  it("flips modified=true when contents diverge", async () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "doc-sharing");
    const schemaItem = store.getSingletonByKind(DataStoreItemKind.SCHEMA);
    store.update(schemaItem, schemaItem.editableContents + "\n");
    const { result } = await renderHook(() => useDocumentIdentity(store, () => "Document Sharing"));
    expect(result.current.kind === "example" && result.current.modified).toBe(true);
  });

  it("returns 'shared' for shared baselines", async () => {
    const store = new EphemeralDataStore();
    store.setBaseline("shared", "abc123");
    const { result } = await renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current).toEqual({
      kind: "shared",
      reference: "abc123",
      modified: false,
    });
  });
});
