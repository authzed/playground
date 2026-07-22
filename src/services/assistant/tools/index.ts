import { ToolRegistry } from "../registry";

import {
  addCheckWatchTool,
  listCheckWatchesTool,
  removeCheckWatchTool,
  updateCheckWatchTool,
} from "./checkWatches";
import { editDocumentTool } from "./editDocument";
import { explainCheckTool } from "./explainCheck";
import { openTabToLineTool } from "./openTabToLine";
import { runCheckTool } from "./runCheck";
import { runValidationTool } from "./runValidation";

const ALL_CLIENT_TOOLS = [
  editDocumentTool,
  runCheckTool,
  explainCheckTool,
  runValidationTool,
  listCheckWatchesTool,
  addCheckWatchTool,
  updateCheckWatchTool,
  removeCheckWatchTool,
  openTabToLineTool,
];

export const CLIENT_TOOL_NAMES = ALL_CLIENT_TOOLS.map((t) => t.name);

// Chat UI display metadata (icon + tooltip label), declared per tool above —
// consumed by ToolActivityChip so it needs no per-tool name checks either.
export const TOOL_DISPLAY: Record<string, { icon: string; label: string }> = Object.fromEntries(
  ALL_CLIENT_TOOLS.map((t) => [t.name, { icon: t.icon ?? "•", label: t.label ?? t.name }]),
);

export function buildDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of ALL_CLIENT_TOOLS) registry.register(tool);
  return registry;
}
