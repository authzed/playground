import { ToolRegistry } from "../registry";

import {
  addCheckWatchTool,
  listCheckWatchesTool,
  removeCheckWatchTool,
  updateCheckWatchTool,
} from "./checkWatches";
import { editDocumentTool } from "./editDocument";
import { openTabToLineTool } from "./openTabToLine";
import { runCheckTool } from "./runCheck";
import { runValidationTool } from "./runValidation";

const ALL_CLIENT_TOOLS = [
  editDocumentTool,
  runCheckTool,
  runValidationTool,
  listCheckWatchesTool,
  addCheckWatchTool,
  updateCheckWatchTool,
  removeCheckWatchTool,
  openTabToLineTool,
];

export const CLIENT_TOOL_NAMES = ALL_CLIENT_TOOLS.map((t) => t.name);

export function buildDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of ALL_CLIENT_TOOLS) registry.register(tool);
  return registry;
}
