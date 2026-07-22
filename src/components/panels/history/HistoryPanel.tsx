import { Button } from "@/components/ui/button";

import type { DataStore } from "../../../services/datastore";
import { useHistoryStore } from "../../../services/history/historyStore";
import { restoreRevision } from "../../../services/history/useHistoryRecorder";

const SOURCE_LABEL: Record<string, string> = {
  manual: "manual edit",
  ai: "AI",
  restore: "restore",
};

export function HistoryPanel({ datastore }: { datastore: DataStore }) {
  const revisions = useHistoryStore((s) => s.revisions);
  const ordered = [...revisions].reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-chrome-divider px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        History
      </div>
      <div className="flex-1 divide-y divide-chrome-divider overflow-auto">
        {ordered.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">No revisions yet.</div>
        )}
        {ordered.map((rev) => (
          <div key={rev.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <div className="min-w-0">
              <div className="truncate">
                <span className="rounded bg-muted px-1 py-0.5 font-mono">
                  {SOURCE_LABEL[rev.source] ?? rev.source}
                </span>{" "}
                {rev.label ?? ""}
              </div>
              <div className="text-muted-foreground">{new Date(rev.ts).toLocaleTimeString()}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => restoreRevision(datastore, rev)}>
              Restore
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
