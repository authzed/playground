import { create } from "zustand";

import type { RevealRange } from "../../services/assistant/types";
import type { DataStoreItemKind } from "../../services/datastore";

export interface RevealRequest {
  kind: DataStoreItemKind;
  range: RevealRange;
  nonce: number;
}

interface RevealStore {
  request: RevealRequest | null;
  requestReveal: (kind: DataStoreItemKind, range: RevealRange) => void;
}

export const useRevealStore = create<RevealStore>((set, get) => ({
  request: null,
  requestReveal: (kind, range) =>
    set({ request: { kind, range, nonce: (get().request?.nonce ?? 0) + 1 } }),
}));
