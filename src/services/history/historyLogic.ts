import type { HistoryDocs, Revision } from "./types";

export const HISTORY_CAP = 30;

const FIELDS: (keyof HistoryDocs)[] = ["schema", "relationships", "assertions", "expected"];

export function docsEqual(a: HistoryDocs, b: HistoryDocs): boolean {
  return FIELDS.every((f) => a[f] === b[f]);
}

export function trimToCap(revisions: Revision[], cap: number): Revision[] {
  return revisions.length <= cap ? revisions : revisions.slice(revisions.length - cap);
}

export function summarizeChange(prev: HistoryDocs | undefined, next: HistoryDocs): string {
  if (!prev) return "initial";
  const changed = FIELDS.filter((f) => prev[f] !== next[f]);
  return changed.length ? changed.join(", ") : "no change";
}
