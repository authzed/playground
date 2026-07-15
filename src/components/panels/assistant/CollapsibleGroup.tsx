import { useState } from "react";

/**
 * CollapsibleGroup collapses a set of related items (tool chips, change diffs)
 * behind a single header once a turn completes, so a long run of actions or edits
 * does not dominate the chat's vertical space. Collapsed by default.
 */
export function CollapsibleGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-chrome-divider text-xs">
      <button
        type="button"
        className="w-full px-2 py-1 text-left font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div className="space-y-2 border-t border-chrome-divider p-2">{children}</div>}
    </div>
  );
}
