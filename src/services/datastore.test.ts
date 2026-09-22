import { describe, expect, it } from "vitest";

import { DataStoreItemKind, EphemeralDataStore } from "./datastore";

describe("DataStore baseline tracking", () => {
  it("isModified returns false when no baseline is set", () => {
    const store = new EphemeralDataStore();
    expect(store.isModified()).toBe(false);
    expect(store.getBaseline()).toBeNull();
  });

  it("isModified returns false right after setBaseline()", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "test-example");
    expect(store.isModified()).toBe(false);
    expect(store.getBaseline()?.identifier).toBe("test-example");
    expect(store.getBaseline()?.kind).toBe("example");
  });

  it("isModified returns true after content changes post-baseline", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("example", "test-example");
    const schemaItem = store.getSingletonByKind(DataStoreItemKind.SCHEMA);
    store.update(schemaItem, schemaItem.editableContents + "\n// edit");
    expect(store.isModified()).toBe(true);
  });

  it("clearBaseline removes the baseline", () => {
    const store = new EphemeralDataStore();
    store.setBaseline("shared", "abc123");
    expect(store.getBaseline()).not.toBeNull();
    store.clearBaseline();
    expect(store.getBaseline()).toBeNull();
    expect(store.isModified()).toBe(false);
  });

  it("computeContentHash is stable for identical content", () => {
    const store1 = new EphemeralDataStore();
    const store2 = new EphemeralDataStore();
    expect(store1.computeContentHash()).toBe(store2.computeContentHash());
  });

  it("computeContentHash changes when content changes", () => {
    const store = new EphemeralDataStore();
    const before = store.computeContentHash();
    const item = store.getSingletonByKind(DataStoreItemKind.SCHEMA);
    store.update(item, "different");
    expect(store.computeContentHash()).not.toBe(before);
  });
});

describe("EphemeralDataStore isolation", () => {
  it("editing one store does not leak into a freshly constructed store", () => {
    const first = new EphemeralDataStore();
    const item = first.getSingletonByKind(DataStoreItemKind.SCHEMA);
    first.update(item, "definition leaked {}");

    const second = new EphemeralDataStore();
    expect(second.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents).not.toContain(
      "leaked",
    );
  });
});
