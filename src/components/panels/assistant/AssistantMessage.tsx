import { AlertTriangle, Check } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { DisplayMessage } from "../../../services/assistant/store";
import type { LocalParseService } from "../../../services/localparse";

import { CollapsibleGroup } from "./CollapsibleGroup";
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
  const diffs = artifacts.filter((a) => a.kind === "diff");
  const showUndo = diffs.length > 0 && !!onUndo && message.state !== "pending";

  // Collapse only once the turn succeeded — not while streaming, and not on error
  // (on failure the actions/changes stay visible so the user can see what happened).
  const done = message.state === "done";
  const collapseActions = done && message.toolActivity.length > 1;
  const collapseChanges = done && diffs.length > 1;

  const chips = (
    <div className="flex flex-wrap gap-1.5">
      {message.toolActivity.map((a, i) => (
        <ToolActivityChip key={i} activity={a} />
      ))}
    </div>
  );

  // Render artifacts in the order they occurred so traces (diagnostics) keep their
  // chronological position relative to edits. When collapsing, the whole run of
  // diffs folds into one "Changes made" group placed where the first diff occurred.
  const renderedArtifacts: ReactNode[] = [];
  let changesPlaced = false;
  artifacts.forEach((a, i) => {
    if (a.kind === "trace") {
      renderedArtifacts.push(
        <TraceCard key={i} trace={a.trace} localParseService={localParseService} />,
      );
    } else if (!collapseChanges) {
      renderedArtifacts.push(<DiffCard key={i} diff={a} />);
    } else if (!changesPlaced) {
      changesPlaced = true;
      renderedArtifacts.push(
        <CollapsibleGroup key="changes" title={`Changes made (${diffs.length})`}>
          {diffs.map((d, di) => (
            <DiffCard key={di} diff={d} />
          ))}
        </CollapsibleGroup>,
      );
    }
  });

  return (
    <div className="group mr-6 space-y-2">
      {message.text && <Markdown>{message.text}</Markdown>}
      {message.toolActivity.length > 0 &&
        (collapseActions ? (
          <CollapsibleGroup title={`Actions taken (${message.toolActivity.length})`}>
            {chips}
          </CollapsibleGroup>
        ) : (
          chips
        ))}
      {renderedArtifacts}
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
