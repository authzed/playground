import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { DisplayMessage } from "../../../services/assistant/store";
import type { LocalParseService } from "../../../services/localparse";

import { DiffCard } from "./DiffCard";
import { Markdown } from "./Markdown";
import { ToolActivityChip } from "./ToolActivityChip";
import { TraceCard } from "./TraceCard";

export function AssistantMessage({
  message,
  onUndo,
  localParseService,
}: {
  message: DisplayMessage;
  onUndo?: () => void;
  localParseService: LocalParseService;
}) {
  if (message.role === "user") {
    return (
      <div className="ml-6 rounded bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
        {message.text}
      </div>
    );
  }

  // Undo is a single message-level action: it restores the pre-turn checkpoint,
  // reverting EVERY edit this message made — so it belongs to the message, not to
  // an individual diff card, and only shows when the message actually edited docs.
  const artifacts = message.artifacts ?? [];
  const showUndo =
    artifacts.some((a) => a.kind === "diff") && !!onUndo && message.state !== "pending";

  return (
    <div className="group mr-6 space-y-2">
      {message.text && <Markdown>{message.text}</Markdown>}
      {message.toolActivity.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.toolActivity.map((a, i) => (
            <ToolActivityChip key={i} activity={a} />
          ))}
        </div>
      )}
      {artifacts.map((a, i) =>
        a.kind === "diff" ? (
          <DiffCard key={i} diff={a} />
        ) : (
          <TraceCard key={i} trace={a.trace} localParseService={localParseService} />
        ),
      )}
      {message.state === "error" && (
        <div className="flex items-start gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Failed — {message.errorText ?? "something went wrong"}</span>
        </div>
      )}
      {(message.state === "done" || showUndo) && (
        <div className="flex items-center justify-between gap-2">
          {message.state === "done" ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Done
            </span>
          ) : (
            <span />
          )}
          {showUndo && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onUndo}
              title="Restore all documents to their state before this message"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              Undo changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
