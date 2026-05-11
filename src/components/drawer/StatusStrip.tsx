import { CircleAlert, Eye, Terminal } from "lucide-react";
import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { LiveCheckItemStatus } from "../../services/check";
import { Services } from "../../services/services";

import { PanelId, useDrawerStore } from "./state";

interface StatusStripProps {
  services: Services;
}

export function StatusStrip({ services }: StatusStripProps) {
  const open = useDrawerStore((s) => s.open);
  const activePanel = useDrawerStore((s) => s.activePanel);
  const togglePanel = useDrawerStore((s) => s.togglePanel);

  const errorCount = services.problemService.errorCount;
  const warningCount = services.problemService.warnings.length;
  const watches = services.liveCheckService.items;
  const watchSuccess = watches.filter((i) => i.status === LiveCheckItemStatus.FOUND).length;
  const watchFail = watches.filter((i) => i.status === LiveCheckItemStatus.NOT_FOUND).length;
  const watchInvalid = watches.filter((i) => i.status === LiveCheckItemStatus.INVALID).length;
  const watchUnable = watches.filter((i) => i.status === LiveCheckItemStatus.NOT_VALID).length;
  const watchCaveated = watches.filter((i) => i.status === LiveCheckItemStatus.CAVEATED).length;
  const watchPending = watches.filter((i) => i.status === LiveCheckItemStatus.NOT_CHECKED).length;

  const isActive = (id: PanelId) => open && activePanel === id;

  return (
    <div className="flex h-10 shrink-0 items-stretch bg-chrome-tabbar text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <PanelButton
            id="problems"
            aria-label="problems panel trigger"
            active={isActive("problems")}
            onClick={() => togglePanel("problems")}
            icon={
              <CircleAlert
                className={errorCount > 0 ? "text-destructive" : "text-muted-foreground"}
              />
            }
            label="Problems"
            compact={errorCount === 0 && warningCount === 0}
            badges={
              [
                errorCount > 0 && { value: errorCount, variant: "error" as const },
                warningCount > 0 && { value: warningCount, variant: "warning" as const },
              ].filter(Boolean) as Array<{ value: number; variant: "error" | "warning" }>
            }
          />
        </TooltipTrigger>
        <TooltipContent side="top">Problems and validation errors</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <PanelButton
            id="watches"
            aria-label="watches panel trigger"
            active={isActive("watches")}
            onClick={() => togglePanel("watches")}
            icon={
              <Eye className={watches.length === 0 ? "text-muted-foreground" : "text-foreground"} />
            }
            label="Check Watches"
            compact={watches.length === 0}
            badges={
              [
                watchSuccess > 0 && { value: watchSuccess, variant: "success" as const },
                watchFail > 0 && { value: watchFail, variant: "error" as const },
                watchInvalid > 0 && { value: watchInvalid, variant: "warning" as const },
                watchUnable > 0 && { value: watchUnable, variant: "unable" as const },
                watchCaveated > 0 && { value: watchCaveated, variant: "missing" as const },
              ].filter(Boolean) as Array<{
                value: number;
                variant: "success" | "error" | "warning" | "unable" | "missing";
              }>
            }
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {watches.length === 0 ? (
            "Live permission check watches"
          ) : watchSuccess === watches.length ? (
            `All ${watches.length} check ${watches.length === 1 ? "watch" : "watches"} passed`
          ) : (
            <div className="flex flex-col gap-0.5">
              {watchFail > 0 && <div>{watchFail} failed</div>}
              {watchInvalid > 0 && <div>{watchInvalid} invalid</div>}
              {watchUnable > 0 && <div>{watchUnable} unable to run</div>}
              {watchCaveated > 0 && <div>{watchCaveated} missing context</div>}
              {watchPending > 0 && <div>{watchPending} pending</div>}
            </div>
          )}
        </TooltipContent>
      </Tooltip>

      <div className="ml-auto border-t border-chrome-divider" />

      <Tooltip>
        <TooltipTrigger asChild>
          <PanelButton
            id="terminal"
            active={isActive("terminal")}
            onClick={() => togglePanel("terminal")}
            icon={<Terminal className="text-foreground" />}
            label={
              <>
                <code className="font-mono">zed</code> terminal
              </>
            }
            compact={false}
            badges={[]}
          />
        </TooltipTrigger>
        <TooltipContent side="top">zed CLI terminal</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface PanelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: PanelId;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
  compact: boolean;
  badges: Array<{ value: number; variant: "success" | "error" | "warning" | "unable" | "missing" }>;
}

const PanelButton = React.forwardRef<HTMLButtonElement, PanelButtonProps>(function PanelButton(
  { id: _id, active, onClick, icon, label, compact, badges, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      data-state={compact ? "compact" : "expanded"}
      data-active={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 px-4 py-2 transition-all duration-200",
        // Active button merges with the drawer above (no top border).
        // Inactive buttons get a top border to separate the strip from the
        // content above.
        active
          ? "bg-chrome-panel text-foreground"
          : "border-t border-chrome-divider text-muted-foreground hover:bg-chrome-panel/50 hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {icon}
      {!compact && <span>{label}</span>}
      {badges.map((b, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-xs",
            b.variant === "success" && "bg-emerald-700 text-emerald-50",
            b.variant === "error" && "bg-destructive text-destructive-foreground",
            b.variant === "warning" && "bg-yellow-700 text-yellow-50",
            b.variant === "unable" && "bg-orange-700 text-orange-50",
            b.variant === "missing" && "bg-indigo-700 text-indigo-50",
          )}
        >
          {b.value}
        </span>
      ))}
    </button>
  );
});
