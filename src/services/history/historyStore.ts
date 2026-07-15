import { get as idbGet, set as idbSet } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

import { HISTORY_CAP, docsEqual, trimToCap } from "./historyLogic";
import type { HistoryDocs, Revision } from "./types";

const IDB_KEY = "playground-history";

export interface HistoryStorage {
  load(): Promise<Revision[]>;
  save(revisions: Revision[]): Promise<void>;
}

export function idbHistoryStorage(): HistoryStorage {
  return {
    async load() {
      return (await idbGet<Revision[]>(IDB_KEY)) ?? [];
    },
    async save(revisions) {
      try {
        await idbSet(IDB_KEY, revisions);
      } catch {
        // Quota or private-mode failure: drop oldest half and retry once.
        try {
          await idbSet(IDB_KEY, revisions.slice(Math.floor(revisions.length / 2)));
        } catch {
          /* give up silently; history is best-effort */
        }
      }
    },
  };
}

interface HistoryState {
  revisions: Revision[];
  storage: HistoryStorage | null;
  hydrate: (storage?: HistoryStorage) => Promise<void>;
  record: (entry: { source: Revision["source"]; label?: string; docs: HistoryDocs }) => string;
  get: (id: string) => Revision | undefined;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  revisions: [],
  storage: null,
  async hydrate(storage) {
    const s = storage ?? idbHistoryStorage();
    set({ storage: s, revisions: await s.load() });
  },
  record(entry) {
    const revs = get().revisions;
    const latest = revs.length > 0 ? revs[revs.length - 1] : undefined;
    if (latest && docsEqual(latest.docs, entry.docs)) return latest.id;
    const id = uuidv4();
    const revision: Revision = {
      id,
      ts: Date.now(),
      source: entry.source,
      label: entry.label,
      docs: entry.docs,
    };
    const revisions = trimToCap([...get().revisions, revision], HISTORY_CAP);
    set({ revisions });
    void get().storage?.save(revisions);
    return id;
  },
  get(id) {
    return get().revisions.find((r) => r.id === id);
  },
  clear() {
    set({ revisions: [] });
    void get().storage?.save([]);
  },
}));
