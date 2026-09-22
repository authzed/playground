import { describe, expect, it, vi } from "vitest";

import {
  DataStoreItemKind,
  EphemeralDataStore,
  readDatastoreDocs,
  type DataStore,
} from "../../services/datastore";

import { mountPlaygroundWithStore } from "./helpers";

// Genuine parser skew — a schema SpiceDB accepts but our JS parser rejects — cannot be
// synthesised, since anything this parser rejects today it also rejected when the fixture
// was written. Forcing the failure is the only way to reach the fallback path, which is
// where the interesting behaviour lives. Isolated in its own file so the rest of the
// browser suite keeps the real enumeration.
vi.mock("../../services/expectedkeys", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/expectedkeys")>();
  return { ...actual, enumerateExpectedKeys: () => undefined };
});

function makeStore(expectedRelations: string): DataStore {
  const defaults = readDatastoreDocs(new EphemeralDataStore());
  const store = new EphemeralDataStore();
  store.load({
    schema: defaults.schema,
    relationshipsYaml: defaults.relationships,
    assertionsYaml: defaults.assertions,
    verificationYaml: expectedRelations,
  });
  return store;
}

const expectedRelationsOf = (store: DataStore) =>
  store.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS).editableContents ?? "";

describe("generating expected relations when the schema cannot be enumerated", () => {
  it("still populates existing keys, and says the result may be incomplete", async () => {
    const store = makeStore("resource:someresource#view: []\n");
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    await expect.element(screen.getByText("Expected relations may be incomplete")).toBeVisible();

    // The hand-written key is still populated by SpiceDB — skipping enumeration must not
    // cost the user the behaviour that worked before this feature existed.
    const generated = expectedRelationsOf(store);
    expect(generated).toContain("[user:somegal] is <resource:someresource#viewer>");
    // ...but nothing was enumerated, so keys the user never wrote are absent.
    expect(generated).not.toContain("resource:anotherresource#view");
  });

  it("warns even when regenerating changes nothing", async () => {
    // anotherresource has no viewer relationship, so this key regenerates to exactly itself
    // and the write is skipped. That is the most likely outcome when enumeration was
    // skipped, and the one where staying silent leaves the button looking broken — so the
    // warning has to be raised before the unchanged-result return, not after it.
    const store = makeStore("resource:anotherresource#viewer: []\n");
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    await expect.element(screen.getByText("Expected relations may be incomplete")).toBeVisible();
  });
});
