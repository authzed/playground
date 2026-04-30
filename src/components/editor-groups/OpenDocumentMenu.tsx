import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DOCUMENT_BADGE_CODES, DOCUMENT_BADGE_COLORS, DOCUMENT_LABELS } from "./EditorTab";
import { useEditorStore } from "./state";

interface OpenDocumentMenuProps {
  groupId: string;
}

export function OpenDocumentMenu({ groupId }: OpenDocumentMenuProps) {
  const closedPool = useEditorStore((s) => s.closedPool);
  const openInGroup = useEditorStore((s) => s.openInGroup);

  if (closedPool.length === 0) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Open document">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Open document</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {closedPool.map((doc) => (
          <DropdownMenuItem key={doc} onClick={() => openInGroup(doc, groupId)}>
            <span
              aria-hidden
              className={cn(
                "inline-flex h-4 shrink-0 items-center justify-center rounded px-1 text-[9px] font-bold uppercase tracking-wide text-white",
                DOCUMENT_BADGE_COLORS[doc],
              )}
            >
              {DOCUMENT_BADGE_CODES[doc]}
            </span>
            {DOCUMENT_LABELS[doc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
