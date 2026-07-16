import { SKILL_OVERVIEW } from "../_skill/content.js";

import type { AiRequest } from "./schema.js";
import { SERVER_TOOLS, SERVER_TOOL_NAMES } from "./serverTools.js";

export class ToolCollisionError extends Error {}

const PLAYGROUND_INSTRUCTIONS = `You are the SpiceDB Playground assistant. You help users design
SpiceDB schemas, write relationships/assertions, debug permissions, and answer questions.

- The current playground documents are provided below. Edit them with the edit_document tool.
- Prefer running run_check and run_validation to verify your work rather than guessing.
- When the user asks WHY a check is allowed/denied/conditional, call explain_check: it
  returns the debug trace (so you can explain the exact branch) and renders it in the chat.
- Use read_skill_reference for detailed patterns/anti-patterns before non-trivial designs.
- When you make a change, briefly say what you changed and why.
- When you show a snippet in your reply, use a fenced code block tagged with the
  document type: \`\`\`zed for schema, \`\`\`relationships for relationships, and
  \`\`\`yaml for assertions or expected relations.
- Keep answers concise and grounded in the actual state.`;

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export function buildSystemBlocks(state: AiRequest["state"]): SystemBlock[] {
  const stateText = [
    "# Current playground state",
    "## Schema",
    "```zed",
    state.schema || "(empty)",
    "```",
    "## Relationships",
    "```",
    state.relationships || "(empty)",
    "```",
    "## Assertions",
    "```yaml",
    state.assertions || "(empty)",
    "```",
    "## Expected relations",
    "```yaml",
    state.expected || "(empty)",
    "```",
  ].join("\n");

  return [
    // Static, cacheable prefix: skill + instructions.
    {
      type: "text",
      text: `${SKILL_OVERVIEW}\n\n${PLAYGROUND_INSTRUCTIONS}`,
      cache_control: { type: "ephemeral" },
    },
    // Dynamic suffix: the live state (changes each request).
    { type: "text", text: stateText },
  ];
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function buildToolDefs(clientTools: AiRequest["tools"]): ToolDef[] {
  for (const t of clientTools) {
    if (SERVER_TOOL_NAMES.has(t.name)) {
      throw new ToolCollisionError(`Client tool "${t.name}" collides with a server tool`);
    }
  }
  const serverDefs: ToolDef[] = SERVER_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
  return [...clientTools, ...serverDefs];
}
