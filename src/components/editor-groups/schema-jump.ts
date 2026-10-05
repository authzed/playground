import { create } from "zustand";

import { useEditorStore } from "./state";

/** A 1-indexed line/column position in the schema editor (matches Monaco + parser ranges). */
export type SchemaRevealLocation = { line: number; column: number };

type SchemaJumpState = {
  /** A location the schema editor should reveal, or undefined if none is pending. */
  pendingReveal: SchemaRevealLocation | undefined;
  /** Activate the schema document and request a reveal at the given position. */
  jumpToSchema: (line: number, column: number) => void;
  /** Clear the pending reveal once it has been applied. */
  consumeReveal: () => void;
};

/**
 * Module-level store coordinating "jump to schema" navigation from the
 * relationship editors. Kept separate from the editor-groups store so the
 * relationship editors can trigger jumps without threading callbacks through
 * the component tree.
 */
export const useSchemaJumpStore = create<SchemaJumpState>((set) => ({
  pendingReveal: undefined,
  jumpToSchema: (line, column) => {
    useEditorStore.getState().showDocument("schema");
    set({ pendingReveal: { line, column } });
  },
  consumeReveal: () => set({ pendingReveal: undefined }),
}));
