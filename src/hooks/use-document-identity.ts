import { useMemo, useSyncExternalStore } from "react";

import type { DataStore } from "../services/datastore";

export type DocumentIdentity =
  | { kind: "untitled" }
  | { kind: "example"; name: string; modified: boolean }
  | { kind: "shared"; reference: string; modified: boolean };

/**
 * useDocumentIdentity derives the document identity from the datastore's baseline state.
 * Reflects "Untitled" until an example or shared link sets a baseline; reflects
 * "modified" once the contents diverge from that baseline.
 *
 * The result is memoized against the datastore's editIndex so that the (relatively
 * expensive) sha256 content-hash inside `isModified()` is only recomputed when
 * the contents actually change — not on every parent re-render.
 */
export function useDocumentIdentity(
  datastore: DataStore,
  exampleNameLookup: (id: string) => string | undefined,
): DocumentIdentity {
  const subscribe = (callback: () => void) => datastore.registerListener(callback);
  const getSnapshot = () => datastore.currentIndex();
  const editIndex = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => {
    void editIndex;
    const baseline = datastore.getBaseline();
    if (!baseline) {
      return { kind: "untitled" };
    }
    const modified = datastore.isModified();
    if (baseline.kind === "example") {
      return {
        kind: "example",
        name: exampleNameLookup(baseline.identifier) ?? baseline.identifier,
        modified,
      };
    }
    return { kind: "shared", reference: baseline.identifier, modified };
  }, [editIndex, datastore, exampleNameLookup]);
}
