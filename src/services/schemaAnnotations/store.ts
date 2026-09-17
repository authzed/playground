import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SchemaAnnotation, ToggleState } from "./types";

export type AnnotationStatus = "idle" | "generating" | "error";

export interface SchemaAnnotationState {
  annotations: SchemaAnnotation[];
  toggleState: ToggleState;
  status: AnnotationStatus;
  errorMessage?: string;
  setToggleState: (next: ToggleState) => void;
  setAnnotations: (items: SchemaAnnotation[], toggleState?: ToggleState) => void;
  setStatus: (status: AnnotationStatus, errorMessage?: string) => void;
  reset: () => void;
}

export const useSchemaAnnotationStore = create<SchemaAnnotationState>()(
  persist(
    (set) => ({
      annotations: [],
      toggleState: "off",
      status: "idle",
      errorMessage: undefined,
      setToggleState: (toggleState) => set({ toggleState }),
      setAnnotations: (annotations, toggleState) =>
        set((s) => ({
          annotations,
          status: "idle",
          errorMessage: undefined,
          toggleState: toggleState ?? s.toggleState,
        })),
      setStatus: (status, errorMessage) => set({ status, errorMessage }),
      reset: () =>
        set({ annotations: [], toggleState: "off", status: "idle", errorMessage: undefined }),
    }),
    {
      name: "playground-schema-annotations",
      version: 1,
      // Persist content + chosen density only; status/error are transient.
      partialize: (s) => ({ annotations: s.annotations, toggleState: s.toggleState }),
    },
  ),
);
