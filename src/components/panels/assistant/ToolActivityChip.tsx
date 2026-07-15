import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  run_check: "🔍",
  run_validation: "✅",
  edit_document: "✎",
  add_check_watch: "📌",
  list_check_watches: "📋",
  update_check_watch: "✏️",
  remove_check_watch: "🗑",
  open_tab_to_line: "↪",
};

export function ToolActivityChip({
  activity,
}: {
  activity: { name: string; summary: string; ok: boolean };
}) {
  return (
    <div
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
