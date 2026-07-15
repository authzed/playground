import { Bot, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type DockPanelId, useRightDockStore } from "./state";

export function DockActivityBar({ aiEnabled }: { aiEnabled: boolean }) {
  const open = useRightDockStore((s) => s.open);
  const activePanel = useRightDockStore((s) => s.activePanel);
  const togglePanel = useRightDockStore((s) => s.togglePanel);

  const isActive = (id: DockPanelId) => open && activePanel === id;

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-chrome-divider bg-chrome-tabbar py-2">
      {aiEnabled && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Assistant"
          className={cn(isActive("assistant") && "bg-chrome-panel text-foreground")}
          onClick={() => togglePanel("assistant")}
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
