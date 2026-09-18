import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataStoreItemKind, EphemeralDataStore } from "../../services/datastore";
import { hashSymbolSource, resolveSymbol } from "../../services/schemaAnnotations/resolve";
import { useSchemaAnnotationStore } from "../../services/schemaAnnotations/store";

import { mountPlayground } from "./helpers";

const blockCount = () => document.querySelectorAll(".schema-annot-block").length;
const tagCount = () => document.querySelectorAll(".schema-annot-tag").length;

const clearRelationshipsEditorCookie = () => {
  document.cookie = "relgrid-type=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
};

// Regression: inline schema explanations vanished after switching to another
// top-level tab and back to Schema.
describe("schema annotations across tab switches", () => {
  // Annotates the `user` definition on line 1, which is always inside the
  // (very short) editor viewport of the browser test harness.
  const seed = (toggle: "compact" | "full") => {
    const schemaText = new EphemeralDataStore().getSingletonByKind(
      DataStoreItemKind.SCHEMA,
    ).editableContents!;
    // Hash the real symbol source so the annotation is fresh (not stale).
    const sourceHash = hashSymbolSource(
      resolveSymbol(schemaText, "definition", "user")!.sourceText,
    );
    useSchemaAnnotationStore.getState().reset();
    useSchemaAnnotationStore.getState().setAnnotations(
      [
        {
          symbolKind: "definition",
          symbolPath: "user",
          shortLabel: "a user",
          explanation: "A user of the system.",
          sourceHash,
        },
      ],
      toggle,
    );
  };

  beforeEach(() => {
    vi.stubEnv("VITE_AI_ENABLED", "true");
    clearRelationshipsEditorCookie();
  });

  afterEach(() => {
    useSchemaAnnotationStore.getState().reset();
    clearRelationshipsEditorCookie();
    vi.unstubAllEnvs();
  });

  it.each([
    ["full", "Relationships"],
    ["full", "Assertions"],
    ["compact", "Relationships"],
    ["compact", "Assertions"],
  ] as const)("keeps %s annotations after Schema -> %s -> Schema", async (toggle, otherTab) => {
    seed(toggle);
    const shown = toggle === "full" ? blockCount : tagCount;
    const screen = await mountPlayground();
    await screen.getByRole("tab", { name: "Schema" }).click();
    await expect.poll(shown).toBe(1);

    await screen.getByRole("tab", { name: otherTab }).click();
    // Prove the switch really happened (the schema editor's annotations are gone).
    await expect.poll(shown).toBe(0);

    await screen.getByRole("tab", { name: "Schema" }).click();
    await expect.poll(shown).toBe(1);
  });

  // Schema, Relationships (code editor) and Assertions render their
  // EditorDisplay at the same position, so without a per-document key React
  // reuses one instance whose editor registry only knows the item it was
  // first mounted for. Here the instance is first mounted for Relationships
  // (grid -> code), so Schema is never registered and its annotations vanish.
  it.each(["full", "compact"] as const)(
    "keeps %s annotations when the shared editor was first mounted for another tab",
    async (toggle) => {
      seed(toggle);
      const shown = toggle === "full" ? blockCount : tagCount;
      const screen = await mountPlayground();
      await screen.getByRole("tab", { name: "Schema" }).click();
      await expect.poll(shown).toBe(1);

      await screen.getByRole("tab", { name: "Relationships" }).click();
      await screen.getByRole("radio", { name: "code editor" }).click();
      await expect.poll(shown).toBe(0);

      await screen.getByRole("tab", { name: "Schema" }).click();
      await expect.poll(shown).toBe(1);
    },
  );
});
