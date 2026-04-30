import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { maxDrawerHeight, PanelId, useDrawerStore } from "./state";

interface DrawerProps {
  panels: Record<PanelId, React.ReactNode>;
  className?: string;
}

const PANEL_LABELS: Record<PanelId, React.ReactNode> = {
  problems: "Problems",
  watches: "Check Watches",
  terminal: (
    <>
      <code className="font-mono">zed</code> terminal
    </>
  ),
};

export function Drawer({ panels, className }: DrawerProps) {
  const open = useDrawerStore((s) => s.open);
  const activePanel = useDrawerStore((s) => s.activePanel);
  const perPanelHeight = useDrawerStore((s) => s.perPanelHeight);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const setHeight = useDrawerStore((s) => s.setHeight);

  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{
    y: number;
    startHeight: number;
  } | null>(null);

  // Re-clamp the drawer height when the viewport changes so a user-shrunk
  // window can't leave the drawer covering the whole screen.
  const [maxH, setMaxH] = React.useState(() => maxDrawerHeight());
  React.useEffect(() => {
    const onResize = () => setMaxH(maxDrawerHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!dragging || !dragStart || !activePanel) return;

    const onMove = (e: MouseEvent) => {
      const dy = dragStart.y - e.clientY;
      setHeight(activePanel, dragStart.startHeight + dy);
    };

    const onUp = () => {
      setDragging(false);
      setDragStart(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart, activePanel, setHeight]);

  if (!open || !activePanel) return null;

  const height = Math.min(perPanelHeight[activePanel], maxH);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setDragStart({ y: e.clientY, startHeight: height });
  };

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-t border-chrome-divider bg-card",
        className,
      )}
      style={{ height: `${height}px`, maxHeight: `${maxH}px` }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="h-1 shrink-0 cursor-row-resize bg-chrome-tabbar hover:bg-primary/40"
        role="separator"
        aria-orientation="horizontal"
      />

      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between bg-chrome-tabbar px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{PANEL_LABELS[activePanel]}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={closeDrawer}>
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </div>

      {/* Active panel */}
      <div className="relative flex-1 min-h-0 overflow-auto">{panels[activePanel]}</div>
    </div>
  );
}
