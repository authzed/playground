import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { buildCheckWatchPrompt, buildErrorPrompt } from "../../services/assistant/debugPrompts";
import { requestAssistantDebug } from "../../services/assistant/debugRequest";
import { LiveCheckItem } from "../../services/check";
import { DeveloperError } from "../../spicedb-common/protodefs/developer/v1/developer_pb";

/**
 * AskAssistantFixAction is the per-error "Ask assistant to fix" button used in
 * the Problems panel. Its parent renders it only when AI is enabled.
 */
export function AskAssistantFixAction({ error }: { error: DeveloperError }) {
  const onClick = () =>
    requestAssistantDebug(
      buildErrorPrompt({
        source: error.source,
        line: error.line,
        message: error.message,
        context: error.context ?? "",
      }),
      "problems",
    );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="xs" variant="ghost" onClick={onClick}>
          <Sparkles />
          Ask assistant to fix
        </Button>
      </TooltipTrigger>
      <TooltipContent>Have the assistant debug and fix this error</TooltipContent>
    </Tooltip>
  );
}

/**
 * AskAssistantDebugButton is the per-watch "Ask assistant to debug" icon button
 * used in the Watches panel. Its parent renders it only when AI is enabled and
 * the watch is in a non-passing state (isDebuggableWatchStatus).
 */
export function AskAssistantDebugButton({ item }: { item: LiveCheckItem }) {
  const onClick = () =>
    requestAssistantDebug(
      buildCheckWatchPrompt({
        object: item.object,
        action: item.action,
        subject: item.subject,
        context: item.context,
        status: item.status,
        errorMessage: item.errorMessage,
      }),
      "watches",
    );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Ask assistant to debug"
          onClick={onClick}
        >
          <Sparkles />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Have the assistant debug and fix this check</TooltipContent>
    </Tooltip>
  );
}
