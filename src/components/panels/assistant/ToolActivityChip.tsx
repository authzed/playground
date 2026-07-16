import { cn } from "@/lib/utils";

import { TOOL_DISPLAY } from "../../../services/assistant/tools";

export function ToolActivityChip({
  activity,
}: {
  activity: { name: string; summary: string; ok: boolean };
}) {
  const display = TOOL_DISPLAY[activity.name];
  const label = display?.label ?? activity.name;
  return (
    <div
      title={`${label}${activity.summary ? `: ${activity.summary}` : ""}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs",
        activity.ok
          ? "border-chrome-divider text-muted-foreground"
          : "border-destructive/40 text-destructive",
      )}
    >
      <span aria-hidden>{display?.icon ?? "•"}</span>
      <span className="font-mono">{activity.summary}</span>
    </div>
  );
}
