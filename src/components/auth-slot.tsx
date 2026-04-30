import { Settings } from "lucide-react";
import { useState } from "react";

import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * AuthSlot — top-right slot in the playground header. Currently houses
 * the settings cog (which opens the SettingsDialog). The fixed footprint
 * (size-9) is preserved so a future authentication affordance can swap
 * in without reflow.
 */
export function AuthSlot() {
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="auth-slot" className="size-9 shrink-0 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open settings"
            onClick={() => setOpen(true)}
          >
            <Settings className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
