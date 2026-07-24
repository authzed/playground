import { usePostHog } from "@posthog/react";
import { useCallback, useMemo, useRef } from "react";

import { useDrawerStore } from "../../components/drawer/state";
import { useRevealStore } from "../../components/editor-groups/revealStore";
import { useEditorStore } from "../../components/editor-groups/state";
import AppConfig from "../configservice";
import { DataStore, readDatastoreDocs } from "../datastore";
import type { Services } from "../services";

import { runAssistantTurn, type StateSnapshot } from "./controller";
import { useAssistantStore } from "./store";
import { streamAssistant } from "./streamClient";
import { TOOL_DISPLAY, buildDefaultRegistry } from "./tools";
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
  const posthog = usePostHog();

  const readState = useCallback((): StateSnapshot => readDatastoreDocs(datastoreRef.current), []);

  const ctx = useMemo<ToolContext>(
    () => ({
      datastore: datastoreRef.current,
      getServices: () => servicesRef.current,
      reveal: (kind, range) => useRevealStore.getState().requestReveal(kind, range),
      // showDocument activates the tab in whichever group already hosts it
      // (the primary group OR a split secondary group), instead of forcing it
      // into the primary group — which previously duplicated a doc that lived
      // in a right-hand split onto the left side.
      openDocument: (ref) => useEditorStore.getState().showDocument(ref),
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

      posthog.capture("playground_ai_message_sent");
      store.appendUser(text);
      store.setStatus("streaming");
      // Captured so this turn's async continuation can detect a reset()
      // (New chat / example load / share load) that happened while it was
      // in flight and avoid resurrecting stale results into the fresh store.
      const myGeneration = useAssistantStore.getState().generation;

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
              artifacts: [],
              checkpointRevisionId,
              state: "pending",
            },
          ]);
        }
      };
      ensureAssistant();

      const patchAssistant = (fn: (m: import("./store").DisplayMessage) => void) => {
        const s = useAssistantStore.getState();
        // A reset() (bumping generation) means this turn is stale — its
        // in-flight text/tool/artifact events must not resurrect into the
        // fresh (possibly already-reused) display array.
        if (s.generation !== myGeneration) return;
        const display = s.display.map((m) => (m.id === assistantId ? cloneAndPatch(m, fn) : m));
        s.setDisplay(display);
      };

      // Same staleness guard as patchAssistant: a reset() mid-turn must not let
      // this turn's late callbacks write a label into the fresh store.
      const setActivity = (label: string | null) => {
        const s = useAssistantStore.getState();
        if (s.generation !== myGeneration) return;
        s.setActivity(label);
      };

      try {
        const result = await runAssistantTurn(useAssistantStore.getState().messages, {
          stream: (req) => streamAssistant({ endpoint, ...req, signal: abort.signal }),
          registry,
          ctx,
          getState: readState,
          maxRoundTrips: 10,
          onText: (delta) => patchAssistant((m) => (m.text += delta)),
          onToolStart: ({ id, name }) => {
            patchAssistant((m) =>
              m.toolActivity.push({ id, name, summary: "", status: "running" }),
            );
            setActivity(TOOL_DISPLAY[name]?.progress ?? name);
          },
          onToolEnd: ({ id, name, summary, ok }) => {
            patchAssistant((m) => {
              // Resolve the chip this call opened; matching on id keeps
              // concurrent or repeated calls to the same tool distinct.
              let matched = false;
              m.toolActivity = m.toolActivity.map((a) => {
                if (matched || a.id !== id || a.status !== "running") return a;
                matched = true;
                return { ...a, summary, status: ok ? ("ok" as const) : ("error" as const) };
              });
              if (!matched) {
                m.toolActivity.push({ id, name, summary, status: ok ? "ok" : "error" });
              }
            });
            setActivity(null);
          },
          onStatus: (label) => setActivity(label),
          onArtifact: (artifact) => patchAssistant((m) => m.artifacts.push(artifact)),
        });

        if (useAssistantStore.getState().generation !== myGeneration) return;

        if (result.aborted) {
          // The user clicked Stop — stop() already returned status to idle;
          // just finalize the message with whatever streamed in before the abort.
          setActivity(null);
          patchAssistant((m) => {
            m.state = "done";
          });
          return;
        }

        const errText = result.error
          ? result.error.retryAfter
            ? `${result.error.message} (retry in ${result.error.retryAfter}s)`
            : result.error.message
          : undefined;
        patchAssistant((m) => {
          m.state = result.error ? "error" : "done";
          m.errorText = errText;
        });
        setActivity(null);
        useAssistantStore.getState().setMessages(result.messages);
        useAssistantStore.getState().setStatus(result.error ? "error" : "idle", result.error);
      } catch (err) {
        if (useAssistantStore.getState().generation !== myGeneration) return;
        setActivity(null);
        const message = (err as Error).message;
        patchAssistant((m) => {
          m.state = "error";
          m.errorText = message;
        });
        useAssistantStore.getState().setStatus("error", { message });
      }
    },
    [ctx, readState, registry, posthog],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    useAssistantStore.getState().setActivity(null);
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
    toolActivity: [...(m.toolActivity ?? [])],
    artifacts: [...(m.artifacts ?? [])],
  };
  fn(copy);
  return copy;
}
