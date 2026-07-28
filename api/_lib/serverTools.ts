import { SKILL_REFERENCES, type SkillReferenceName } from "../_skill/content.js";

export interface ServerTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  // Present-progressive label shown in the assistant's live status line while
  // this tool runs. Server tools produce no client-side activity chip, so this
  // is the only progress the user sees for them.
  progressLabel: string;
  execute(input: unknown): string;
}

const VALID_REFERENCES: SkillReferenceName[] = [
  "patterns",
  "anti-patterns",
  "schema-evolution",
  "examples",
];

const readSkillReference: ServerTool = {
  name: "read_skill_reference",
  description:
    "Read a reference section from the SpiceDB schema-design skill for detailed patterns, " +
    "anti-patterns, schema-evolution guidance, or worked examples.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        enum: VALID_REFERENCES,
        description: "Which reference section to read.",
      },
    },
    required: ["name"],
  },
  progressLabel: "Reading design references",
  execute(input) {
    const name = (input as { name?: string })?.name;
    if (!name || !VALID_REFERENCES.includes(name as SkillReferenceName)) {
      return `Unknown reference "${name}". Valid names: ${VALID_REFERENCES.join(", ")}.`;
    }
    return SKILL_REFERENCES[name as SkillReferenceName];
  },
};

export const SERVER_TOOLS: ServerTool[] = [readSkillReference];
export const SERVER_TOOL_NAMES = new Set(SERVER_TOOLS.map((t) => t.name));
