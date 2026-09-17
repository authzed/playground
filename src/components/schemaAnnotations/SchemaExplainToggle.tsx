import { CircleX, Lightbulb, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useAssistantStore } from "../../services/assistant/store";
import AppConfig from "../../services/configservice";
import { DataStore, DataStoreItemKind } from "../../services/datastore";
import { requestSchemaExplanation } from "../../services/schemaAnnotations/generate";
import { computeAnnotationViews } from "../../services/schemaAnnotations/resolve";
import { useSchemaAnnotationStore } from "../../services/schemaAnnotations/store";

import { reconcileGeneratingStatus, shouldGenerate } from "./toggleLogic";

export function SchemaExplainToggle(props: { datastore: DataStore }) {
  const toggleState = useSchemaAnnotationStore((s) => s.toggleState);
  const annotations = useSchemaAnnotationStore((s) => s.annotations);
  const status = useSchemaAnnotationStore((s) => s.status);
  const setToggleState = useSchemaAnnotationStore((s) => s.setToggleState);
  const setStatus = useSchemaAnnotationStore((s) => s.setStatus);

  const assistantStatus = useAssistantStore((s) => s.status);
  const assistantError = useAssistantStore((s) => s.error);

  // Reconcile our "generating" flag with the assistant turn lifecycle. The tool
  // clears it on success (setAnnotations -> status idle); here we clear/flag it
  // if the turn ends or errors without producing annotations — but only once the
  // turn has actually gone busy, so we don't disarm ourselves during the gap
  // between requesting the prompt and the assistant starting it.
  const sawBusyRef = useRef(false);
  useEffect(() => {
    const decision = reconcileGeneratingStatus(status, assistantStatus, sawBusyRef.current);
    sawBusyRef.current = decision.sawBusy;
    if (decision.status !== status) {
      if (decision.status === "error") setStatus("error", assistantError?.message);
      else setStatus(decision.status);
    }
  }, [assistantStatus, assistantError, status, setStatus]);

  if (!AppConfig().aiEnabled) return null;

  const generating = status === "generating";
  const schemaText =
    props.datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "";
  const views = computeAnnotationViews(schemaText, annotations).views;
  const freshViewCount = views.filter((v) => !v.stale).length;
  const anyStale = views.some((v) => v.stale);
  const hasAnnotations = annotations.length > 0;

  const onValueChange = (next: string) => {
    if (next !== "off" && next !== "compact" && next !== "full") return; // radix deselect => ""
    setToggleState(next);
    // Regenerate when turning on and nothing currently resolves to a fresh view
    // (empty, or all stale / unresolvable after a wholesale schema change) —
    // otherwise the toggle would show nothing and offer no way to regenerate.
    if (shouldGenerate(next, freshViewCount)) requestSchemaExplanation();
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground select-none">
        <Lightbulb className="w-3.5 h-3.5" />
        Explain
      </span>
      <ToggleGroup
        value={toggleState}
        variant="outline"
        type="single"
        size="sm"
        disabled={generating}
        onValueChange={onValueChange}
        aria-label="Schema explanations"
        // Dimmed when the shown explanations are out of date; Regenerate is the fix.
        className={anyStale ? "opacity-50" : undefined}
      >
        <ToggleGroupItem
          value="off"
          title="Hide explanations"
          className="cursor-pointer h-7 px-2 text-xs"
        >
          Off
        </ToggleGroupItem>
        <ToggleGroupItem
          value="compact"
          title="Short inline explanations"
          className="cursor-pointer h-7 px-2 text-xs"
        >
          Compact
        </ToggleGroupItem>
        <ToggleGroupItem
          value="full"
          title="Full inline explanations"
          className="cursor-pointer h-7 px-2 text-xs"
        >
          Full
        </ToggleGroupItem>
      </ToggleGroup>
      {hasAnnotations && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={anyStale ? "outline" : "ghost"}
              size="sm"
              disabled={generating}
              onClick={() => requestSchemaExplanation()}
              className="cursor-pointer"
              aria-label="Regenerate explanations"
            >
              <RefreshCw className={generating ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {anyStale ? "Explanations are out of date — regenerate" : "Regenerate explanations"}
          </TooltipContent>
        </Tooltip>
      )}
      {generating && !hasAnnotations && (
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Explaining" />
      )}
      {status === "error" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <CircleX className="w-4 h-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>Couldn’t generate explanations. Toggle again to retry.</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
