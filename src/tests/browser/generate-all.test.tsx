import { describe, expect, it } from "vitest";

import {
  DataStoreItemKind,
  EphemeralDataStore,
  readDatastoreDocs,
  type DataStore,
} from "../../services/datastore";

import { mountPlaygroundWithStore } from "./helpers";

/**
 * makeStore returns an in-memory datastore holding the real default document, with only the
 * expected relations replaced. Reading the defaults from a datastore rather than restating
 * them keeps these tests honest if the defaults ever change.
 */
function makeStore(expectedRelations: string, assertions?: string): DataStore {
  const defaults = readDatastoreDocs(new EphemeralDataStore());
  const store = new EphemeralDataStore();
  store.load({
    schema: defaults.schema,
    relationshipsYaml: defaults.relationships,
    assertionsYaml: assertions ?? defaults.assertions,
    verificationYaml: expectedRelations,
  });
  return store;
}

const expectedRelationsOf = (store: DataStore) =>
  store.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS).editableContents ?? "";

describe("generating expected relations", () => {
  it("populates the whole section from an empty document", async () => {
    const store = makeStore("");
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    // Re-Generate stays disabled until the WASM developer service reports ready.
    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    await expect.element(screen.getByText("Validated!")).toBeVisible();

    // Every relation and permission of both objects in the test relationships, not just a
    // sample. anotherresource only appears as a writer, so its viewer/view/write keys exist
    // purely through enumeration — the user never wrote them.
    const generated = expectedRelationsOf(store);
    for (const key of [
      "resource:someresource#writer",
      "resource:someresource#viewer",
      "resource:someresource#write",
      "resource:someresource#view",
      "resource:anotherresource#writer",
      "resource:anotherresource#viewer",
      "resource:anotherresource#write",
      "resource:anotherresource#view",
    ]) {
      expect(generated).toContain(`${key}:`);
    }
    expect(generated).toContain('"[user:somegal] is <resource:someresource#viewer>"');
  });

  it("reverts a diff back to the original document", async () => {
    // Seeded non-empty on purpose: from an empty document, "restored the original" would be
    // indistinguishable from "cleared the document". Uses a real definition from the default
    // schema so the test does not quietly depend on SpiceDB tolerating unknown object types.
    const original = "resource:someresource#view: []\n";
    const store = makeStore(original);
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const computeAndDiff = screen.getByRole("button", { name: "Compute and Diff" });
    await expect.element(computeAndDiff, { timeout: 60000 }).toBeEnabled();
    await computeAndDiff.click();

    // Entering diff mode swaps the toolbar for Accept/Revert.
    const revert = screen.getByRole("button", { name: "Revert Update" });
    await expect.element(revert).toBeVisible();
    expect(expectedRelationsOf(store)).toContain("resource:anotherresource#view");

    await revert.click();
    await expect.element(screen.getByRole("button", { name: "Re-Generate" })).toBeVisible();

    // Revert must restore the original document exactly, not leave the generated keys behind
    // and not simply blank the document.
    expect(expectedRelationsOf(store)).toBe(original);
  });

  it("aborts with a toast when the document is not a YAML map", async () => {
    const malformed = "- one\n- two\n";
    const store = makeStore(malformed);
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    // Asserting the description, not the title — the user-error toasts share a title.
    await expect
      .element(
        screen.getByText("Expected Relations must be a YAML map of keys to expected subjects."),
      )
      .toBeVisible();
    // The document must be left exactly as the user wrote it, not partially rewritten.
    expect(expectedRelationsOf(store)).toBe(malformed);
  });

  it("still generates when the assertions document is malformed", async () => {
    // Assertions have no bearing on expected relations, so a broken assertions document
    // must not block generation.
    const store = makeStore("", "{invalid: [\n");
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    await expect
      .element(screen.getByText(/resource:anotherresource#view/), { timeout: 15000 })
      .toBeVisible();
    expect(expectedRelationsOf(store)).toContain("resource:anotherresource#view");
  });

  it("toasts and writes nothing when the schema cannot be evaluated", async () => {
    // Seeded non-empty on purpose: from an empty document, "nothing was written" would be
    // indistinguishable from "wrote an empty document".
    const existing =
      'resource:someresource#view:\n  - "[user:somegal] is <resource:someresource#viewer>"\n';
    const store = makeStore(existing);
    store.update(
      store.getSingletonByKind(DataStoreItemKind.SCHEMA),
      "definition user {} definition {{{ broken",
    );
    const screen = await mountPlaygroundWithStore(store);

    await screen.getByRole("tab", { name: "Expected Relations" }).click();

    const regenerate = screen.getByRole("button", { name: "Re-Generate" });
    await expect.element(regenerate, { timeout: 60000 }).toBeEnabled();
    await regenerate.click();

    await expect
      .element(screen.getByText("The schema and relationships could not be evaluated."))
      .toBeVisible();
    expect(expectedRelationsOf(store)).toBe(existing);

    // Our parser also fails on this schema, but the incomplete-enumeration warning is
    // deferred until SpiceDB succeeds — so an outright failure must not stack both.
    expect(screen.getByText("Expected relations may be incomplete").query()).toBeNull();
  });
});
