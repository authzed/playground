import { useCallback, useMemo, useRef } from "react";

import { useDrawerStore } from "../../components/drawer/state";
import { useRevealStore } from "../../components/editor-groups/revealStore";
import { useEditorStore } from "../../components/editor-groups/state";
import AppConfig from "../configservice";
import { DataStore, DataStoreItemKind } from "../datastore";
import type { Services } from "../services";

import { runAssistantTurn, type StateSnapshot } from "./controller";
import { useAssistantStore } from "./store";
import { streamAssistant } from "./streamClient";
import { buildDefaultRegistry } from "./tools";
import type { HistoryRecorder, ToolContext } from "./types";

export function useAssistantController(
  services: Services,
  datastore: DataStore,
  history: HistoryRecorder,
) {
  // Keep the latest services/datastore in refs (services is rebuilt every render).
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const datastoreRef = useRef(datastore);
  datastoreRef.current = datastore;

  const registry = useMemo(() => buildDefaultRegistry(), []);
  const abortRef = useRef<AbortController | null>(null);

  const readState = useCallback((): StateSnapshot => {
    const ds = datastoreRef.current;
    return {
      schema: ds.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "",
      relationships: ds.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).editableContents ?? "",
      assertions: ds.getSingletonByKind(DataStoreItemKind.ASSERTIONS).editableContents ?? "",
      expected: ds.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS).editableContents ?? "",
    };
  }, []);

  const ctx = useMemo<ToolContext>(
    () => ({
      datastore: datastoreRef.current,
      getServices: () => servicesRef.current,
      reveal: (kind, range) => useRevealStore.getState().requestReveal(kind, range),
      openDocument: (ref) => {
        const s = useEditorStore.getState();
        const groupId = s.layout.kind === "single" ? s.layout.group.id : s.layout.primary.id;
        if (s.closedPool.includes(ref)) s.openInGroup(ref, groupId);
        else s.setActiveTab(groupId, ref);
      },
      openWatchesPanel: () => useDrawerStore.getState().openPanel("watches"),
      history,
    }),
    [history],
  );
  // ctx.datastore must always be current:
  ctx.datastore = datastoreRef.current;

  const submit = useCallback(
    async (text: string) => {
      const store = useAssistantStore.getState();
      if (store.status === "streaming" || store.status === "executing_tools") return;
      if (!text.trim()) return;

      store.appendUser(text);
      store.setStatus("streaming");

      const checkpointRevisionId = ctx.history.record({
        source: "manual",
        label: "Before assistant turn",
      });

      const abort = new AbortController();
      abortRef.current = abort;

      const endpoint = `${AppConfig().aiApiEndpoint ?? ""}/api/ai`;

      // Build/extend the current assistant display message as text/tools arrive.
      let assistantId = `a-${useAssistantStore.getState().display.length}`;
      const ensureAssistant = () => {
        const s = useAssistantStore.getState();
        if ((s.display.length ? s.display[s.display.length - 1] : undefined)?.id !== assistantId) {
          s.setDisplay([
            ...s.display,
            {
              id: assistantId,
              role: "assistant",
              text: "",
              toolActivity: [],
              diffs: [],
              checkpointRevisionId,
            },
          ]);
        }
      };
      ensureAssistant();

      const patchAssistant = (fn: (m: import("./store").DisplayMessage) => void) => {
        const s = useAssistantStore.getState();
        const display = s.display.map((m) => (m.id === assistantId ? cloneAndPatch(m, fn) : m));
        s.setDisplay(display);
      };

      const result = await runAssistantTurn(useAssistantStore.getState().messages, {
        stream: (req) => streamAssistant({ endpoint, ...req, signal: abort.signal }),
        registry,
        ctx,
        getState: readState,
        maxRoundTrips: 10,
        onText: (delta) => patchAssistant((m) => (m.text += delta)),
        onToolActivity: (a) => patchAssistant((m) => m.toolActivity.push(a)),
        onDiff: (d) => patchAssistant((m) => m.diffs.push({ ...d })),
      });

      useAssistantStore.getState().setMessages(result.messages);
      useAssistantStore.getState().setStatus(result.error ? "error" : "idle", result.error);
    },
    [ctx, readState, registry],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    useAssistantStore.getState().setStatus("idle");
  }, []);

  return { submit, stop };
}

function cloneAndPatch(
  m: import("./store").DisplayMessage,
  fn: (m: import("./store").DisplayMessage) => void,
) {
  const copy: import("./store").DisplayMessage = {
    ...m,
    toolActivity: [...m.toolActivity],
    diffs: [...m.diffs],
  };
  fn(copy);
  return copy;
}
