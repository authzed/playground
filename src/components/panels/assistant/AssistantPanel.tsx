import { Button } from "@/components/ui/button";

import { type DisplayMessage, useAssistantStore } from "../../../services/assistant/store";
import type { HistoryRecorder } from "../../../services/assistant/types";
import { useAssistantController } from "../../../services/assistant/useAssistantController";
import type { DataStore } from "../../../services/datastore";
import { useHistoryStore } from "../../../services/history/historyStore";
import { restoreRevision } from "../../../services/history/useHistoryRecorder";
import type { Services } from "../../../services/services";

import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

export function AssistantPanel({
  services,
  datastore,
  history,
}: {
  services: Services;
  datastore: DataStore;
  history: HistoryRecorder;
}) {
  const { submit } = useAssistantController(services, datastore, history);
  const display = useAssistantStore((s) => s.display);
  const status = useAssistantStore((s) => s.status);
  const reset = useAssistantStore((s) => s.reset);

  const onUndo = (m: DisplayMessage) => {
    if (!m.checkpointRevisionId) return;
    const rev = useHistoryStore.getState().get(m.checkpointRevisionId);
    if (rev) restoreRevision(datastore, rev);
  };

  const busy = status === "streaming" || status === "executing_tools";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-chrome-divider px-3 py-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          Assistant
        </span>
        <Button size="sm" variant="ghost" onClick={reset}>
          New chat
        </Button>
      </div>
      <MessageList messages={display} onUndo={onUndo} busy={busy} />
      <ChatInput disabled={busy} onSubmit={submit} />
    </div>
  );
}
