/**
 * DocumentRef identifies a document that can be opened in an editor group.
 * In Spec 2, documents are the four singletons plus Visualizer.
 * Multi-file later: DocumentRef becomes a sum type with a 'file' variant.
 */
export type DocumentRef = "schema" | "relationships" | "assertions" | "expected" | "visualizer";

export const ALL_DOCUMENT_REFS: DocumentRef[] = [
  "schema",
  "relationships",
  "assertions",
  "expected",
  "visualizer",
];

export type EditorGroup = {
  /** Stable id for persistence and React keying. */
  id: string;
  /** Documents currently in this group, ordered for tab display. */
  tabs: DocumentRef[];
  /** Active document; must be in `tabs`. */
  activeTab: DocumentRef;
};

export type EditorLayout =
  | { kind: "single"; group: EditorGroup }
  | {
      kind: "split";
      direction: "horizontal" | "vertical";
      primary: EditorGroup;
      secondary: EditorGroup;
    };

/** Documents not currently in any group. */
export type ClosedPool = DocumentRef[];

/** Complete editor area state. */
export type EditorState = {
  layout: EditorLayout;
  closedPool: ClosedPool;
};

/** Default state on first load: 1 group with 4 default docs; Visualizer in closed pool. */
export const DEFAULT_EDITOR_STATE: EditorState = {
  layout: {
    kind: "single",
    group: {
      id: "g1",
      tabs: ["schema", "relationships", "assertions", "expected"],
      activeTab: "schema",
    },
  },
  closedPool: ["visualizer"],
};
