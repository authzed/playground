import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { type DisplayMessage, useAssistantStore } from "../../../services/assistant/store";
import type { LocalParseService } from "../../../services/localparse";

import { AssistantMessage } from "./AssistantMessage";

export function MessageList({
  messages,
  onUndo,
  busy,
  localParseService,
}: {
  messages: DisplayMessage[];
  onUndo: (m: DisplayMessage) => void;
  busy: boolean;
  localParseService: LocalParseService;
}) {
  const activity = useAssistantStore((s) => s.activity);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Some environments' scrollIntoView returns a Promise; an effect must
    // return either nothing or a cleanup function, so don't let that value
    // become this effect's implicit return.
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const last = messages.length > 0 ? messages[messages.length - 1] : undefined;
  // A specific activity ("Editing document", "Reading design references") always
  // wins; the generic fallback covers the model's own thinking/streaming time,
  // during which no tool is running.
  const fallback =
    last?.role === "assistant" && !last.text && last.toolActivity.length === 0
      ? "Thinking…"
      : "Working…";
  const working = activity ?? fallback;

  return (
    <div className="flex-1 space-y-3 overflow-auto p-3">
      {messages.length === 0 && !busy && (
        <div className="px-1 py-2 text-xs text-muted-foreground">
          Ask me to design your schema, write assertions, or explain why a check passes or fails.
        </div>
      )}
      {messages.map((m) => (
        <AssistantMessage
          key={m.id}
          message={m}
          onUndo={() => onUndo(m)}
          localParseService={localParseService}
        />
      ))}
      {busy && (
        <div className="mr-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span>{working}</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
