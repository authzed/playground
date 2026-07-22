import { SKILL_OVERVIEW } from "../_skill/content.js";

import type { OpenRouterMessage, OpenRouterToolDef } from "./openrouterClient.js";
import type { AiRequest } from "./schema.js";
import { SERVER_TOOLS, SERVER_TOOL_NAMES } from "./serverTools.js";

export class ToolCollisionError extends Error {}

const PLAYGROUND_INSTRUCTIONS = `You are the SpiceDB Playground assistant. You help users design
SpiceDB schemas, write relationships/assertions, debug permissions, and answer schema related questions.

- The current playground documents are provided below. Edit them with the edit_document tool.
- Prefer running run_check and run_validation to verify your work rather than guessing.
- When the user asks WHY a check is allowed/denied/conditional, call explain_check: it
  returns the debug trace (so you can explain the exact branch) and renders it in the chat.
- Use read_skill_reference for detailed patterns/anti-patterns before non-trivial designs.
- When you make a change, briefly say what you changed and why.
- When you show a snippet in your reply, use a fenced code block tagged with the
  document type: \`\`\`zed for schema, \`\`\`relationships for relationships, and
  \`\`\`yaml for assertions or expected relations.
- Keep answers concise and grounded in the actual state.
- For questions unrelated to SpiceDB schema, interacting with the current playground state,
  or if you are generally uncertain of a response, refer the user to SpiceDB documentation
  at https://authzed.com/docs`;

export function buildSystemMessage(state: AiRequest["state"]): OpenRouterMessage {
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

  return {
    role: "system",
    // Anthropic-specific extension (cache_control), passed through by
    // OpenRouter — safe for the current anthropic/claude-sonnet-5 model, but
    // would need reconsidering if the model is ever changed to a non-Anthropic
    // provider. Splitting into a cached static prefix (skill overview +
    // instructions, which never changes) and an uncached dynamic suffix (the
    // live playground state, which changes every request) mirrors the
    // pre-OpenRouter-migration Anthropic-native caching design.
    content: [
      {
        type: "text",
        text: `${SKILL_OVERVIEW}\n\n${PLAYGROUND_INSTRUCTIONS}`,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: stateText },
    ],
  };
}

export function buildToolDefs(clientTools: AiRequest["tools"]): OpenRouterToolDef[] {
  for (const t of clientTools) {
    if (SERVER_TOOL_NAMES.has(t.name)) {
      throw new ToolCollisionError(`Client tool "${t.name}" collides with a server tool`);
    }
  }
  const clientDefs: OpenRouterToolDef[] = clientTools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
  const serverDefs: OpenRouterToolDef[] = SERVER_TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
  return [...clientDefs, ...serverDefs];
}
