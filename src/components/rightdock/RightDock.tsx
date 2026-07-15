import * as React from "react";

import { cn } from "@/lib/utils";

import { type DockPanelId, maxDockWidth, useRightDockStore } from "./state";

export function RightDock({ panels }: { panels: Partial<Record<DockPanelId, React.ReactNode>> }) {
  const open = useRightDockStore((s) => s.open);
  const activePanel = useRightDockStore((s) => s.activePanel);
  const perPanelWidth = useRightDockStore((s) => s.perPanelWidth);
  const setWidth = useRightDockStore((s) => s.setWidth);

  const [drag, setDrag] = React.useState<{ x: number; startWidth: number } | null>(null);

  React.useEffect(() => {
    if (!drag || !activePanel) return;
    const onMove = (e: MouseEvent) => setWidth(activePanel, drag.startWidth + (drag.x - e.clientX));
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, activePanel, setWidth]);

  // The active panel may be unavailable (e.g. a persisted "assistant" panel when AI
  // is disabled) — hide the dock rather than showing an empty frame.
  const content = activePanel ? panels[activePanel] : undefined;
  if (!open || !activePanel || !content) return null;
  const width = Math.min(perPanelWidth[activePanel], maxDockWidth());

  return (
    <div
      className="flex shrink-0 flex-row border-l border-chrome-divider bg-chrome-panel"
      style={{ width: `${width}px` }}
    >
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setDrag({ x: e.clientX, startWidth: width });
        }}
        className={cn("w-1 shrink-0 cursor-col-resize bg-chrome-tabbar hover:bg-primary/40")}
        role="separator"
        aria-orientation="vertical"
      />
      <div className="min-w-0 flex-1 overflow-hidden">{content}</div>
    </div>
  );
}
