import type { DisplayMessage } from "../../../services/assistant/store";

import { DiffCard } from "./DiffCard";
import { Markdown } from "./Markdown";
import { ToolActivityChip } from "./ToolActivityChip";

export function AssistantMessage({
  message,
  onUndo,
}: {
  message: DisplayMessage;
  onUndo?: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="ml-6 rounded bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
        {message.text}
      </div>
    );
  }
  return (
    <div className="mr-6 space-y-2">
      {message.text && <Markdown>{message.text}</Markdown>}
      {message.toolActivity.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.toolActivity.map((a, i) => (
            <ToolActivityChip key={i} activity={a} />
          ))}
        </div>
      )}
      {message.diffs.map((d, i) => (
        <DiffCard key={i} diff={d} onUndo={i === 0 ? onUndo : undefined} />
      ))}
    </div>
  );
}
