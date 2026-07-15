import type { z } from "zod";

import type { DocumentRef } from "../../components/editor-groups/types";
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

export interface AssistantTool<I = unknown, R = unknown> {
  name: string;
  description: string;
  parameters: z.ZodType<I>;
  resultSchema?: z.ZodType<R>;
  execute: (input: I, ctx: ToolContext) => R | Promise<R>;
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
