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
}

export interface WireTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ContentBlock = { type: string; [k: string]: unknown };
export type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };
export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};
export type ClientToolCall = { id: string; name: string; input: unknown };

export type SseEvent =
  | { event: "text"; data: { delta: string } }
  | {
      event: "handoff";
      data: {
        assistantContent: ContentBlock[];
        serverToolResults: { tool_use_id: string; content: string }[];
        clientToolCalls: ClientToolCall[];
      };
    }
  | { event: "done"; data: { assistantContent: ContentBlock[]; stop_reason: string } }
  | { event: "error"; data: { code?: string; message: string; retryAfter?: number } };
