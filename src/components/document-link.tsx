import { cn } from "@/lib/utils";

import { useEditorStore } from "./editor-groups/state";
import type { DocumentRef } from "./editor-groups/types";

/**
 * A link-styled button that switches the primary editor group's active tab to
 * the given document. If the document is in the closed pool, it is opened
 * into the primary group first. Used by panels that previously routed via
 * URL paths (`/schema`, `/relationships`, …) before tab→URL mapping was
 * removed.
 */
export function DocumentLink({
  to,
  className,
  children,
}: {
  to: DocumentRef;
  className?: string;
  children: React.ReactNode;
}) {
  const handleClick = () => {
    const s = useEditorStore.getState();
    const groupId = s.layout.kind === "single" ? s.layout.group.id : s.layout.primary.id;
    if (s.closedPool.includes(to)) {
      s.openInGroup(to, groupId);
    } else {
      s.setActiveTab(groupId, to);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "cursor-pointer underline-offset-2 hover:underline hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
