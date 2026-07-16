import { usePostHog } from "@posthog/react";
import { Bot, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type DockPanelId, useRightDockStore } from "./state";

export function DockActivityBar({ aiEnabled }: { aiEnabled: boolean }) {
  const open = useRightDockStore((s) => s.open);
  const activePanel = useRightDockStore((s) => s.activePanel);
  const togglePanel = useRightDockStore((s) => s.togglePanel);
  const posthog = usePostHog();

  const isActive = (id: DockPanelId) => open && activePanel === id;

  const onToggleAssistant = () => {
    // Only fires on the closed -> open transition, not on close or re-toggle.
    if (!isActive("assistant")) posthog.capture("playground_ai_panel_opened");
    togglePanel("assistant");
  };

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-chrome-divider bg-chrome-tabbar py-2">
      {aiEnabled && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Assistant"
          className={cn(isActive("assistant") && "bg-chrome-panel text-foreground")}
          onClick={onToggleAssistant}
        >
          <Bot />
        </Button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="History"
        className={cn(isActive("history") && "bg-chrome-panel text-foreground")}
        onClick={() => togglePanel("history")}
      >
        <History />
      </Button>
    </div>
  );
}
