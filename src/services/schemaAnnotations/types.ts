export type AnnotationKind = "definition" | "relation" | "permission" | "caveat";

export type ToggleState = "off" | "compact" | "full";

export interface SchemaAnnotation {
  symbolKind: AnnotationKind;
  /** "document" or "has_role" for definitions/caveats; "document/view" for members. */
  symbolPath: string;
  shortLabel: string;
  explanation: string;
  /** hashSymbolSource() of the symbol's source text at generation time. */
  sourceHash: string;
}

export interface UnexplainedSymbol {
  symbolKind: AnnotationKind;
  symbolPath: string;
  startLine: number;
}

export interface AnnotationView {
  annotation: SchemaAnnotation;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  stale: boolean;
}
