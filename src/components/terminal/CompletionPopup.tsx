import * as ReactDOM from "react-dom";

import { cn } from "@/lib/utils";

import { CommandNode } from "./zedCommands";

interface CompletionPopupProps {
  completions: CommandNode[];
  activeIndex: number;
  onSelect: (completion: CommandNode) => void;
  onSetActive: (index: number) => void;
  /** Bounding rect of the input that anchors the popup. */
  anchorRect: DOMRect | null;
}

export function CompletionPopup({
  completions,
  activeIndex,
  onSelect,
  onSetActive,
  anchorRect,
}: CompletionPopupProps) {
  if (completions.length === 0 || !anchorRect) return null;

  // Position above the input, anchored to its left edge. Using `position: fixed`
  // so the popup escapes any ancestor `overflow-auto` clipping.
  const style: React.CSSProperties = {
    position: "fixed",
    left: anchorRect.left,
    bottom: window.innerHeight - anchorRect.top + 4,
    zIndex: 50,
  };

  return ReactDOM.createPortal(
    <div
      style={style}
      className="min-w-64 rounded-md border bg-popover text-popover-foreground shadow-md"
      role="listbox"
    >
      {completions.map((c, i) => (
        <div
          key={c.name}
          role="option"
          aria-selected={i === activeIndex}
          onMouseEnter={() => onSetActive(i)}
          onClick={() => onSelect(c)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
            i === activeIndex && "bg-accent text-accent-foreground",
          )}
        >
          <span className="font-mono">{c.name}</span>
          <span className="text-xs text-muted-foreground">— {c.description}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
