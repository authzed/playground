import { SplitSquareHorizontal, SplitSquareVertical, X } from "lucide-react";
import * as React from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { useEditorStore } from "./state";
import { DocumentRef, EditorLayout } from "./types";

interface TabContextMenuProps {
  tab: DocumentRef;
  /** Group currently hosting this tab. */
  groupId: string;
  /** True when this tab can be closed (only false for the last tab in the only group). */
  canClose: boolean;
  children: React.ReactNode;
}

/**
 * Right-click menu for a tab. Wraps the tab element and offers move/split/close
 * actions appropriate to the current layout.
 */
export function TabContextMenu({ tab, groupId, canClose, children }: TabContextMenuProps) {
  const layout = useEditorStore((s) => s.layout);
  const splitTab = useEditorStore((s) => s.splitTab);
  const moveTab = useEditorStore((s) => s.moveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  const moveTarget = getMoveTarget(layout, groupId);
  const canSplit = layout.kind === "single" && layout.group.tabs.length > 1;

  const hasItems = canSplit || moveTarget !== undefined || canClose;
  if (!hasItems) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {canSplit && (
          <>
            <ContextMenuItem onClick={() => splitTab(tab, "horizontal")}>
              <SplitSquareHorizontal />
              Open to right
            </ContextMenuItem>
            <ContextMenuItem onClick={() => splitTab(tab, "vertical")}>
              <SplitSquareVertical />
              Open to bottom
            </ContextMenuItem>
          </>
        )}
        {moveTarget && (
          <ContextMenuItem onClick={() => moveTab(tab, moveTarget.groupId)}>
            Move to {moveTarget.side}
          </ContextMenuItem>
        )}
        {canClose && (canSplit || moveTarget) && <ContextMenuSeparator />}
        {canClose && (
          <ContextMenuItem onClick={() => closeTab(tab)}>
            <X />
            Close
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * For a tab hosted in `groupId` of a split layout, return the other group's id
 * and a directional label ("left"/"right"/"top"/"bottom") for the user-facing
 * "Move to ..." item. Returns undefined for single layouts (no other group).
 */
function getMoveTarget(
  layout: EditorLayout,
  groupId: string,
): { groupId: string; side: "left" | "right" | "top" | "bottom" } | undefined {
  if (layout.kind !== "split") return undefined;
  const inPrimary = layout.primary.id === groupId;
  const otherId = inPrimary ? layout.secondary.id : layout.primary.id;
  const side: "left" | "right" | "top" | "bottom" =
    layout.direction === "horizontal"
      ? inPrimary
        ? "right"
        : "left"
      : inPrimary
        ? "bottom"
        : "top";
  return { groupId: otherId, side };
}
