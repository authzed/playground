import { SplitSquareHorizontal, SplitSquareVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useEditorStore } from "./state";
import { DocumentRef } from "./types";

interface SplitMenuProps {
  /** The tab whose Split action this menu controls. */
  tab: DocumentRef;
}

export function SplitMenu({ tab }: SplitMenuProps) {
  const splitTab = useEditorStore((s) => s.splitTab);
  const layout = useEditorStore((s) => s.layout);

  // Hide the menu when already split (1 split max).
  if (layout.kind === "split") return null;
  // Splitting requires at least 2 tabs (we move one tab out into a new group),
  // so hide the affordance when there's only one tab to avoid suggesting an
  // action that would no-op.
  if (layout.kind === "single" && layout.group.tabs.length <= 1) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Split">
              <SplitSquareHorizontal />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Split editor</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => splitTab(tab, "horizontal")}>
          <SplitSquareHorizontal />
          Open to right
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => splitTab(tab, "vertical")}>
          <SplitSquareVertical />
          Open to bottom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
