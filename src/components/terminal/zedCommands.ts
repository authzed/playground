export type CommandNode = {
  name: string;
  description: string;
  children?: CommandNode[];
};

/**
 * Curated zed CLI command tree for tab completion.
 * Update when zed adds new subcommands.
 */
export const ZED_COMMANDS: CommandNode = {
  name: "zed",
  description: "zed CLI",
  children: [
    {
      name: "schema",
      description: "Manage schemas",
      children: [
        { name: "read", description: "Read the current schema" },
        { name: "write", description: "Write a schema" },
      ],
    },
    {
      name: "permission",
      description: "Permission operations",
      children: [
        { name: "check", description: "Check a permission" },
        { name: "expand", description: "Expand a permission" },
        { name: "lookup-resources", description: "Look up resources" },
        { name: "lookup-subjects", description: "Look up subjects" },
      ],
    },
    {
      name: "relationship",
      description: "Relationship operations",
      children: [
        { name: "create", description: "Create relationships" },
        { name: "delete", description: "Delete relationships" },
        { name: "touch", description: "Touch (upsert) relationships" },
        { name: "read", description: "Read relationships" },
      ],
    },
  ],
};

/**
 * Resolve completions for a given input.
 * Returns the list of matching command nodes for the last token.
 */
export function getCompletions(input: string): CommandNode[] {
  // Split on whitespace; trim only leading whitespace so that a trailing
  // space produces an empty final token. The empty final token indicates the
  // previous token is complete and we should be listing children rather than
  // filtering the previous token's prefix.
  const trimmedLeading = input.replace(/^\s+/, "");
  const tokens = trimmedLeading.length === 0 ? [""] : trimmedLeading.split(/\s+/);

  let node: CommandNode = ZED_COMMANDS;
  let i = 0;

  // If the first token matches the root name (e.g. "zed"), consume it.
  if (tokens.length > 0 && tokens[0] === node.name) {
    i = 1;
  }

  // Match exact tokens until we run out
  for (; i < tokens.length - 1; i++) {
    const child = node.children?.find((c) => c.name === tokens[i]);
    if (!child) return [];
    node = child;
  }

  // Filter children by prefix
  const lastToken = tokens[i] ?? "";
  return (node.children ?? []).filter((c) => c.name.startsWith(lastToken));
}
