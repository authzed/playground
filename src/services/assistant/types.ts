import type { z } from "zod";

import type { DocumentRef } from "../../components/editor-groups/types";
import type { CheckDebugTrace } from "../../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import type { DataStore, DataStoreItemKind } from "../datastore";
import type { Services } from "../services";

export interface RevealRange {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface HistoryRecorder {
  record(entry: { source: "manual" | "ai" | "restore"; label?: string }): string;
}

export const NOOP_HISTORY: HistoryRecorder = { record: () => "" };

export interface ToolContext {
  datastore: DataStore;
  getServices: () => Services;
  reveal: (kind: DataStoreItemKind, range: RevealRange) => void;
  openDocument: (ref: DocumentRef) => void;
  openWatchesPanel: () => void;
  history: HistoryRecorder;
}

/**
 * A rich, UI-only artifact a tool can attach to the chat (a diff card, a
 * check-trace tree, ...). Produced by a tool's render() and rendered by
 * AssistantMessage. Large fields backing it are kept out of the model-facing
 * tool result via redactFromModel — so the controller needs NO per-tool checks.
 */
export type DisplayArtifact =
  | { kind: "diff"; target: string; before: string; after: string }
  | { kind: "trace"; trace: CheckDebugTrace };

export interface AssistantTool<I = unknown, R = unknown> {
  name: string;
  description: string;
  parameters: z.ZodType<I>;
  resultSchema?: z.ZodType<R>;
  execute: (input: I, ctx: ToolContext) => R | Promise<R>;
  // Optional rich-render metadata (declared per tool, not special-cased in the
  // controller). render() derives a UI-only artifact from a SUCCESSFUL result;
  // redactFromModel lists result keys the controller strips from the (verbose)
  // model-facing tool_result.
  render?: (result: R, input: I, ctx: ToolContext) => DisplayArtifact | undefined;
  redactFromModel?: readonly string[];
  // Declares whether a result represents a failure. Defaults to checking a
  // generic `ok` field; declared per tool when the result shape encodes
  // failure differently (e.g. a check's `result: "error"`).
  isError?: (result: R) => boolean;
  // Short human-readable summary of the result, shown in the chat's tool
  // activity chip. Defaults to the result's `error` field or "done".
  summarize?: (result: R, input: I) => string;
  // Display metadata for the tool activity chip. Defaults to a bullet icon
  // and the raw tool name.
  icon?: string;
  label?: string;
  // Present-progressive form shown in the live status line while the tool runs
  // ("Editing document"), as opposed to `label`'s imperative ("Edit document").
  // Falls back to `label`.
  progressLabel?: string;
}

export interface WireTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type UserMessage = { role: "user"; content: string };
export type AssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
};
export type ToolMessage = { role: "tool"; tool_call_id: string; content: string };
export type ChatMessage = UserMessage | AssistantMessage | ToolMessage;
export type ClientToolCall = { id: string; name: string; input: unknown };

export type SseEvent =
  | { event: "text"; data: { delta: string } }
  | {
      event: "handoff";
      data: {
        assistantMessage: AssistantMessage;
        serverToolResults: ToolMessage[];
        clientToolCalls: ClientToolCall[];
        malformedClientToolCalls?: { id: string; name: string; error: string }[];
      };
    }
  | { event: "done"; data: { assistantMessage: AssistantMessage; finish_reason: string } }
  | {
      // Server-side progress, e.g. a server tool starting. Purely transient UI
      // signal — never part of the conversation sent back to the model.
      event: "status";
      data: { label: string };
    }
  | { event: "error"; data: { code?: string; message: string; retryAfter?: number } };
