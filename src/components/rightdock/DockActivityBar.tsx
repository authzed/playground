import { usePostHog } from "@posthog/react";
import { Bot, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDismissible } from "@/hooks/use-dismissible";
import { cn } from "@/lib/utils";

import { type DockPanelId, useRightDockStore } from "./state";

export function DockActivityBar({ aiEnabled }: { aiEnabled: boolean }) {
  const open = useRightDockStore((s) => s.open);
  const activePanel = useRightDockStore((s) => s.activePanel);
  const togglePanel = useRightDockStore((s) => s.togglePanel);
  const posthog = usePostHog();
  const { dismissed: assistantBadgeDismissed, dismiss: dismissAssistantBadge } = useDismissible(
    "assistant",
    "assistant-badge:dismissed",
  );

  const isActive = (id: DockPanelId) => open && activePanel === id;

  const onToggleAssistant = () => {
    // Only fires on the closed -> open transition, not on close or re-toggle.
    if (!isActive("assistant")) posthog.capture("playground_ai_panel_opened");
    dismissAssistantBadge();
    togglePanel("assistant");
  };

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-chrome-divider bg-chrome-tabbar py-2">
      {aiEnabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Assistant"
              className={cn(
                "relative",
                isActive("assistant") && "bg-chrome-panel text-foreground",
              )}
              onClick={onToggleAssistant}
            >
              <Bot />
              {!assistantBadgeDismissed && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500"
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Assistant</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="History"
            className={cn(isActive("history") && "bg-chrome-panel text-foreground")}
            onClick={() => togglePanel("history")}
          >
            <History />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">History</TooltipContent>
      </Tooltip>
    </div>
  );
}
