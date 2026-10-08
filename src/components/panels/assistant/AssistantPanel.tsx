import { usePostHog } from "@posthog/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildManualHelpDraft, summarizeForCommunity } from "@/services/assistant/communityHelp";
import { liveCheckItemToWatch } from "@/services/check";
import AppConfig from "@/services/configservice";
import { readDatastoreDocs } from "@/services/datastore";
import { createShareLink } from "@/services/sharing";

import { type DisplayMessage, useAssistantStore } from "../../../services/assistant/store";
import type { HistoryRecorder } from "../../../services/assistant/types";
import { useAssistantController } from "../../../services/assistant/useAssistantController";
import { usePendingPromptConsumer } from "../../../services/assistant/usePendingPrompt";
import type { DataStore } from "../../../services/datastore";
import { useHistoryStore } from "../../../services/history/historyStore";
import { restoreRevision } from "../../../services/history/useHistoryRecorder";
import type { Services } from "../../../services/services";

import { ChatInput } from "./ChatInput";
import { CommunityHelpDialog } from "./CommunityHelpDialog";
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
  const { submit, stop } = useAssistantController(services, datastore, history);
  // Drain any externally-requested debug prompt (inline "Ask assistant to fix"
  // affordances) into a turn now that the panel is mounted.
  usePendingPromptConsumer(submit);
  const display = useAssistantStore((s) => s.display);
  const status = useAssistantStore((s) => s.status);
  const reset = useAssistantStore((s) => s.reset);
  const posthog = usePostHog();
  const [helpDraft, setHelpDraft] = useState<{ draft: string; generation: number } | null>(null);
  const generation = useAssistantStore((s) => s.generation);
  const openCommunityHelp = (draft: string) => setHelpDraft({ draft, generation });

  const onUndo = (m: DisplayMessage) => {
    if (!m.checkpointRevisionId) return;
    const rev = useHistoryStore.getState().get(m.checkpointRevisionId);
    if (!rev) return;
    posthog.capture("playground_ai_state_restored");
    restoreRevision(datastore, rev);
  };

  const busy = status === "streaming" || status === "executing_tools";

  const onNewChat = () => {
    posthog.capture("playground_ai_chat_started");
    // Abort any in-flight turn before resetting — reset() alone bumps the
    // store's generation (so a stale turn's results are ignored when it
    // resolves), but doesn't stop the underlying fetch from still running.
    stop();
    reset();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-chrome-divider px-3 py-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          Assistant
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              openCommunityHelp(buildManualHelpDraft(useAssistantStore.getState().messages))
            }
          >
            Ask the community
          </Button>
          <Button size="sm" variant="ghost" onClick={onNewChat}>
            New chat
          </Button>
        </div>
      </div>
      <MessageList
        messages={display}
        onUndo={onUndo}
        busy={busy}
        localParseService={services.localParseService}
        onCommunityHelp={openCommunityHelp}
      />
      <ChatInput disabled={busy} onSubmit={submit} />
      {helpDraft !== null && helpDraft.generation === generation && (
        <CommunityHelpDialog
          initialDraft={helpDraft.draft}
          onClose={() => setHelpDraft(null)}
          createLink={
            AppConfig().shareApiEndpoint
              ? () =>
                  createShareLink(
                    readDatastoreDocs(datastore),
                    services.liveCheckService.items.map(liveCheckItemToWatch),
                    AppConfig().shareApiEndpoint!,
                    window.location.href,
                  )
              : undefined
          }
          summarize={
            !busy
              ? (signal) =>
                  summarizeForCommunity({
                    messages: useAssistantStore.getState().messages,
                    state: readDatastoreDocs(datastore),
                    signal,
                  })
              : undefined
          }
        />
      )}
    </div>
  );
}
