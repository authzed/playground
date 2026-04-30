// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataStoreItemKind, EphemeralDataStore } from "../services/datastore";

import { useDocumentIdentity } from "./use-document-identity";

describe("useDocumentIdentity", () => {
  it("returns 'untitled' when no baseline is set", () => {
    const store = new EphemeralDataStore();
    const { result } = renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current.kind).toBe("untitled");
  });

  it("returns 'example' when an example is loaded", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "doc-sharing");
    const { result } = renderHook(() =>
      useDocumentIdentity(store, (id) => (id === "doc-sharing" ? "Document Sharing" : undefined)),
    );
    expect(result.current).toEqual({
      kind: "example",
      name: "Document Sharing",
      modified: false,
    });
  });

  it("falls back to identifier when name lookup returns undefined", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "unknown-id");
    const { result } = renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current).toEqual({
      kind: "example",
      name: "unknown-id",
      modified: false,
    });
  });

  it("flips modified=true when contents diverge", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "doc-sharing");
    const schemaItem = store.getSingletonByKind(DataStoreItemKind.SCHEMA);
    store.update(schemaItem, schemaItem.editableContents + "\n");
    const { result } = renderHook(() => useDocumentIdentity(store, () => "Document Sharing"));
    expect(result.current.kind === "example" && result.current.modified).toBe(true);
  });

  it("returns 'shared' for shared baselines", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("shared", "abc123");
    const { result } = renderHook(() => useDocumentIdentity(store, () => undefined));
    expect(result.current).toEqual({
      kind: "shared",
      reference: "abc123",
      modified: false,
    });
  });
});
