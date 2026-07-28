import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ToolActivity } from "../../../services/assistant/store";
import { TOOL_DISPLAY } from "../../../services/assistant/tools";

export function ToolActivityChip({ activity }: { activity: ToolActivity }) {
  const display = TOOL_DISPLAY[activity.name];
  const label = display?.label ?? activity.name;
  const running = activity.status === "running";
  // Only an explicit "error" renders as a failure: chips persisted before
  // `status` replaced the old `ok` flag have no status at all, and must not be
  // mistaken for failures.
  const failed = activity.status === "error";
  return (
    <div
      title={`${label}${activity.summary ? `: ${activity.summary}` : ""}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs",
        failed
          ? "border-destructive/40 text-destructive"
          : "border-chrome-divider text-muted-foreground",
      )}
    >
      {running ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <span aria-hidden>{display?.icon ?? "•"}</span>
      )}
      {/* While running there is no summary yet, so show what is being done. */}
      <span className="font-mono">{running ? label : activity.summary}</span>
    </div>
  );
}
