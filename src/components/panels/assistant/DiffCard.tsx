import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DiffCard({
  diff,
  onUndo,
}: {
  diff: { target: string; before: string; after: string };
  onUndo?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-chrome-divider text-xs">
      <div className="flex items-center justify-between px-2 py-1">
        <button type="button" className="font-medium" onClick={() => setOpen((o) => !o)}>
          {open ? "▾" : "▸"} what changed ({diff.target})
        </button>
        {onUndo && (
          <Button size="icon-sm" variant="ghost" onClick={onUndo} aria-label="Undo this message">
            Undo
          </Button>
        )}
      </div>
      {open && (
        <pre className="max-h-60 overflow-auto border-t border-chrome-divider p-2 font-mono leading-snug">
          {renderLineDiff(diff.before, diff.after)}
        </pre>
      )}
    </div>
  );
}

function countLines(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
  return counts;
}

// Minimal line-level diff: removed lines prefixed '-', added lines '+'. Lines
// are compared as a multiset (counting duplicates), not a set — otherwise
// deleting one of several identical lines looks like no change at all.
function renderLineDiff(before: string, after: string) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  const afterRemaining = countLines(afterLines);
  const removed = beforeLines.filter((l) => {
    const remaining = afterRemaining.get(l) ?? 0;
    if (remaining > 0) {
      afterRemaining.set(l, remaining - 1);
      return false;
    }
    return true;
  });

  const beforeRemaining = countLines(beforeLines);
  const added = afterLines.filter((l) => {
    const remaining = beforeRemaining.get(l) ?? 0;
    if (remaining > 0) {
      beforeRemaining.set(l, remaining - 1);
      return false;
    }
    return true;
  });

  if (removed.length === 0 && added.length === 0) {
    return <div className="text-muted-foreground">(whitespace or line-order change)</div>;
  }
  return (
    <>
      {removed.map((l, i) => (
        <div key={`r${i}`} className={cn("text-destructive")}>{`- ${l}`}</div>
      ))}
      {added.map((l, i) => (
        <div key={`a${i}`} className="text-emerald-600 dark:text-emerald-400">{`+ ${l}`}</div>
      ))}
    </>
  );
}
