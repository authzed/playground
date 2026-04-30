import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { EditorTab, type TabDiagnostics } from "./EditorTab";
import { OpenDocumentMenu } from "./OpenDocumentMenu";
import { SplitMenu } from "./SplitMenu";
import { useEditorStore } from "./state";
import { TabContextMenu } from "./TabContextMenu";
import { DocumentRef, EditorGroup as EditorGroupType } from "./types";

const DRAG_MIME = "application/x-playground-tab";

interface EditorGroupProps {
  group: EditorGroupType;
  /** True when this group can be closed (only true when split). */
  closable: boolean;
  /** Render function for the active tab's content. */
  renderContent: (active: DocumentRef) => React.ReactNode;
  /** Per-document diagnostic counts; undefined entries mean no badges. */
  tabDiagnostics?: Partial<Record<DocumentRef, TabDiagnostics>>;
  className?: string;
}

type DropIndicator = {
  /** Index in the tab strip where the moving tab will land (0..tabs.length). */
  index: number;
  /** Whether the drop is happening from the same group (visual hint only). */
  fromOtherGroup: boolean;
};

export function EditorGroup({
  group,
  closable,
  renderContent,
  tabDiagnostics,
  className,
}: EditorGroupProps) {
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const moveTab = useEditorStore((s) => s.moveTab);
  const closeGroup = useEditorStore((s) => s.closeGroup);
  const layout = useEditorStore((s) => s.layout);

  const [dropIndicator, setDropIndicator] = React.useState<DropIndicator | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tab: DocumentRef) => {
    e.dataTransfer.setData(DRAG_MIME, tab);
    e.dataTransfer.effectAllowed = "move";
  };

  const isPlaygroundTabDrag = (e: React.DragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes(DRAG_MIME);

  const handleTabDragOver = (e: React.DragEvent<HTMLDivElement>, overTab: DocumentRef) => {
    if (!isPlaygroundTabDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    const overIndex = group.tabs.indexOf(overTab);
    const targetIndex = before ? overIndex : overIndex + 1;
    setDropIndicator({ index: targetIndex, fromOtherGroup: false });
  };

  const handleStripDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isPlaygroundTabDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Only set "drop at end" when the cursor isn't over a tab
    // (which is handled by handleTabDragOver above).
    setDropIndicator((prev) => prev ?? { index: group.tabs.length, fromOtherGroup: false });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the strip entirely (relatedTarget outside)
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const tab = e.dataTransfer.getData(DRAG_MIME) as DocumentRef;
    setDropIndicator(null);
    if (!tab) return;
    e.preventDefault();
    const targetIndex = dropIndicator?.index ?? group.tabs.length;
    const beforeTab = group.tabs[targetIndex];
    moveTab(tab, group.id, beforeTab);
  };

  const canCloseTabs = layout.kind === "split" || group.tabs.length > 1; // can't close the last tab in the only group

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab strip */}
      <div
        className="relative flex shrink-0 items-stretch bg-chrome-tabbar"
        onDragOver={handleStripDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {group.tabs.map((tab, i) => (
          <React.Fragment key={tab}>
            {dropIndicator?.index === i && <DropMarker />}
            <TabContextMenu tab={tab} groupId={group.id} canClose={canCloseTabs}>
              <EditorTab
                document={tab}
                active={tab === group.activeTab}
                canClose={canCloseTabs}
                diagnostics={tabDiagnostics?.[tab]}
                onClick={() => setActiveTab(group.id, tab)}
                onClose={() => closeTab(tab)}
                onDragStart={(e) => handleDragStart(e, tab)}
                onDragOver={(e) => handleTabDragOver(e, tab)}
                onDrop={handleDrop}
              />
            </TabContextMenu>
          </React.Fragment>
        ))}
        {dropIndicator?.index === group.tabs.length && <DropMarker />}
        <div className="ml-1 flex items-center">
          <OpenDocumentMenu groupId={group.id} />
        </div>
        <div className="ml-auto flex items-center pr-1">
          <SplitMenu tab={group.activeTab} />
          {closable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Close group"
                  onClick={() => closeGroup(group.id)}
                >
                  <X />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close group</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Active tab content */}
      <div className="flex-1 min-h-0 relative bg-chrome-panel">
        {renderContent(group.activeTab)}
      </div>
    </div>
  );
}

/**
 * DropMarker — visual indicator showing where a dragged tab will land.
 * Renders inline as a 2px-wide vertical bar in the tab strip.
 */
function DropMarker() {
  return <span aria-hidden className="my-1 w-0.5 self-stretch shrink-0 rounded-full bg-primary" />;
}
