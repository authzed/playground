import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  run_check: "🔍",
  explain_check: "🔎",
  run_validation: "✅",
  edit_document: "✎",
  add_check_watch: "📌",
  list_check_watches: "📋",
  update_check_watch: "✏️",
  remove_check_watch: "🗑",
  open_tab_to_line: "↪",
};

// Human-readable tool names, shown as a tooltip so a terse summary (e.g. "done")
// still says which action it belongs to.
const LABELS: Record<string, string> = {
  run_check: "Run check",
  explain_check: "Explain check",
  run_validation: "Run validation",
  edit_document: "Edit document",
  add_check_watch: "Add check watch",
  list_check_watches: "List check watches",
  update_check_watch: "Update check watch",
  remove_check_watch: "Remove check watch",
  open_tab_to_line: "Open tab",
};

export function ToolActivityChip({
  activity,
}: {
  activity: { name: string; summary: string; ok: boolean };
}) {
  const label = LABELS[activity.name] ?? activity.name;
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
      <span aria-hidden>{ICONS[activity.name] ?? "•"}</span>
      <span className="font-mono">{activity.summary}</span>
    </div>
  );
}
