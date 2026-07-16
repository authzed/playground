import { useEffect, useMemo, useRef } from "react";

import type { HistoryRecorder } from "../assistant/types";
import { DataStore, readDatastoreDocs } from "../datastore";
import { consumePendingSessionReset } from "../sessionReset";

import { useHistoryStore } from "./historyStore";
import type { HistoryDocs, Revision } from "./types";

export function readHistoryDocs(datastore: DataStore): HistoryDocs {
  return readDatastoreDocs(datastore);
}

export function restoreRevision(datastore: DataStore, revision: Revision): void {
  datastore.load(
    {
      schema: revision.docs.schema,
      relationshipsYaml: revision.docs.relationships,
      assertionsYaml: revision.docs.assertions,
      verificationYaml: revision.docs.expected,
    },
    // A restore is an in-session undo — don't fire the reload listeners that
    // would wipe the chat/history the user is restoring within.
    { isRestore: true },
  );
  useHistoryStore
    .getState()
    .record({ source: "restore", label: "Restored a revision", docs: revision.docs });
}

const DEBOUNCE_MS = 1500;

export function useHistoryRecorder(datastore: DataStore): HistoryRecorder {
  const dsRef = useRef(datastore);
  dsRef.current = datastore;

  // Hydrate once + record an initial snapshot. If a new document was loaded via
  // the share route just before this mount, discard the previous document's
  // persisted revisions (consumed after hydrate so it wins over the idb load).
  useEffect(() => {
    void useHistoryStore
      .getState()
      .hydrate()
      .then(() => {
        if (consumePendingSessionReset()) {
          useHistoryStore.getState().clear();
        }
        useHistoryStore.getState().record({
          source: "manual",
          label: "Session start",
          docs: readHistoryDocs(dsRef.current),
        });
      });
  }, []);

  // Debounced manual snapshotter on datastore edits.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unregister = dsRef.current.registerListener(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useHistoryStore
          .getState()
          .record({ source: "manual", docs: readHistoryDocs(dsRef.current) });
      }, DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unregister();
    };
  }, []);

  return useMemo<HistoryRecorder>(
    () => ({
      record: (entry) =>
        useHistoryStore.getState().record({
          source: entry.source,
          label: entry.label,
          docs: readHistoryDocs(dsRef.current),
        }),
    }),
    [],
  );
}
