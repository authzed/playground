import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DocumentRef } from "./types";

interface EditorTabProps {
  document: DocumentRef;
  active: boolean;
  canClose: boolean;
  /** Called when the tab is clicked (excluding the close button). */
  onClick: () => void;
  /** Called when the close × is clicked. */
  onClose: () => void;
  /** Drag-and-drop callbacks. */
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const DOCUMENT_LABELS: Record<DocumentRef, string> = {
  schema: "Schema",
  relationships: "Relationships",
  assertions: "Assertions",
  expected: "Expected Relations",
  visualizer: "Visualizer",
};

export const DOCUMENT_BADGE_COLORS: Record<DocumentRef, string> = {
  schema: "bg-violet-500",
  relationships: "bg-rose-500",
  assertions: "bg-amber-500",
  expected: "bg-emerald-500",
  visualizer: "bg-cyan-500",
};

export const DOCUMENT_BADGE_CODES: Record<DocumentRef, string> = {
  schema: "S",
  relationships: "R",
  assertions: "A",
  expected: "E",
  visualizer: "V",
};

export function EditorTab({
  document,
  active,
  canClose,
  onClick,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
}: EditorTabProps) {
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-active={active}
      className={cn(
        "group inline-flex items-center gap-1.5 px-3 py-2 text-sm select-none cursor-pointer",
        active
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      role="tab"
      aria-selected={active}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase text-white",
          DOCUMENT_BADGE_COLORS[document],
        )}
      >
        {DOCUMENT_BADGE_CODES[document]}
      </span>
      <span>{DOCUMENT_LABELS[document]}</span>
      {canClose && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Close ${DOCUMENT_LABELS[document]}`}
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close tab</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
