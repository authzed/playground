import * as React from "react";

import { cn } from "@/lib/utils";

import { EditorGroup } from "./EditorGroup";
import { useEditorStore } from "./state";
import { DocumentRef } from "./types";

interface EditorGroupsProps {
  /** Render function for an active document's content (one per group). */
  renderContent: (active: DocumentRef) => React.ReactNode;
  className?: string;
}

const SUBMINIMUM_WIDTH = 600; // px per group; below this, force collapse to single
const SPLIT_RATIO_STORAGE_KEY = "playground-editor-split-ratio";
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

function loadInitialRatio(): number {
  if (typeof window === "undefined") return 0.5;
  const raw = window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
  if (!raw) return 0.5;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return 0.5;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, parsed));
}

export function EditorGroups({ renderContent, className }: EditorGroupsProps) {
  const layout = useEditorStore((s) => s.layout);
  const closeGroup = useEditorStore((s) => s.closeGroup);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  const [primaryRatio, setPrimaryRatio] = React.useState<number>(() => loadInitialRatio());

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Persist ratio to localStorage when it changes.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(primaryRatio));
    } catch {
      // Ignore storage failures (private mode, quota, etc).
    }
  }, [primaryRatio]);

  // Sub-minimum width collapse: force single group if width per group would be too small.
  React.useEffect(() => {
    if (
      layout.kind === "split" &&
      layout.direction === "horizontal" &&
      containerWidth !== null &&
      containerWidth / 2 < SUBMINIMUM_WIDTH
    ) {
      closeGroup(layout.secondary.id);
    }
  }, [layout, containerWidth, closeGroup]);

  const startDrag = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>, direction: "horizontal" | "vertical") => {
      e.preventDefault();

      const onMove = (moveEvent: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let ratio: number;
        if (direction === "horizontal") {
          ratio = (moveEvent.clientX - rect.left) / rect.width;
        } else {
          ratio = (moveEvent.clientY - rect.top) / rect.height;
        }
        setPrimaryRatio(Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio)));
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [],
  );

  if (layout.kind === "single") {
    return (
      <div ref={containerRef} className={cn("flex h-full min-h-0 flex-col", className)}>
        <EditorGroup group={layout.group} closable={false} renderContent={renderContent} />
      </div>
    );
  }

  // Split layout
  const direction = layout.direction;
  const flexDirection = direction === "horizontal" ? "flex-row" : "flex-col";

  return (
    <div ref={containerRef} className={cn("h-full flex", flexDirection, className)}>
      <div
        className="min-w-0 min-h-0"
        style={{ flex: `${primaryRatio} 1 0%` }}
      >
        <EditorGroup group={layout.primary} closable renderContent={renderContent} />
      </div>
      <div
        className={cn(
          "shrink-0 bg-chrome-divider hover:bg-primary/40 transition-colors",
          direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        )}
        onMouseDown={(e) => startDrag(e, direction)}
        role="separator"
        aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      />
      <div
        className="min-w-0 min-h-0"
        style={{ flex: `${1 - primaryRatio} 1 0%` }}
      >
        <EditorGroup group={layout.secondary} closable renderContent={renderContent} />
      </div>
    </div>
  );
}
