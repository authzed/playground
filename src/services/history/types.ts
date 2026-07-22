export interface HistoryDocs {
  schema: string;
  relationships: string;
  assertions: string;
  expected: string;
}

export interface Revision {
  id: string;
  ts: number;
  source: "manual" | "ai" | "restore";
  label?: string;
  docs: HistoryDocs;
}
