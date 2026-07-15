import { useEffect, useMemo, useRef } from "react";

import type { HistoryRecorder } from "../assistant/types";
import { DataStore, DataStoreItemKind } from "../datastore";

import { useHistoryStore } from "./historyStore";
import type { HistoryDocs, Revision } from "./types";

export function readHistoryDocs(datastore: DataStore): HistoryDocs {
  return {
    schema: datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "",
    relationships:
      datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).editableContents ?? "",
    assertions: datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS).editableContents ?? "",
    expected:
      datastore.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS).editableContents ?? "",
  };
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

  // Hydrate once + record an initial snapshot.
  useEffect(() => {
    void useHistoryStore
      .getState()
      .hydrate()
      .then(() => {
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
