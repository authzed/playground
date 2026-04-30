import { ChevronDown, FileText } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import type { DocumentIdentity } from "../hooks/use-document-identity";

interface BreadcrumbPillProps {
  identity: DocumentIdentity;
  /** Click handler for opening the dropdown. */
  onClick?: () => void;
  className?: string;
}

/**
 * BreadcrumbPill — a clickable pill in the top bar that shows the current
 * document state (Untitled / Example name / Shared #ref) with an optional
 * "modified" dot. Used as a `DropdownMenu`'s trigger.
 *
 * Wrap it with a DropdownMenu's items at the call site; this component is
 * just the visual trigger.
 */
export const BreadcrumbPill = React.forwardRef<HTMLButtonElement, BreadcrumbPillProps>(
  function BreadcrumbPill({ identity, onClick, className, ...rest }, ref) {
    const label = labelFor(identity);
    const showModifiedDot = identity.kind !== "untitled" && identity.modified;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex h-7 items-center gap-2 rounded-md bg-chrome-pill px-2.5 text-sm text-foreground transition-colors hover:bg-chrome-pill/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
        data-state-kind={identity.kind}
        {...rest}
      >
        <FileText className="size-3.5 opacity-70" />
        <span className="font-medium">{label}</span>
        {showModifiedDot && (
          <span
            className="size-1.5 rounded-full bg-accent"
            aria-label="modified"
            title="Modified"
          />
        )}
        <ChevronDown className="size-3.5 opacity-50" />
      </button>
    );
  },
);

function labelFor(identity: DocumentIdentity): string {
  switch (identity.kind) {
    case "untitled":
      return "Untitled";
    case "example":
      return identity.name;
    case "shared":
      return `Shared #${identity.reference}`;
  }
}
