import z from "zod";

export const MAX_CLIENT_TOOLS = 64;

const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({ name: z.string(), arguments: z.string() }),
});

const UserMessageSchema = z.object({ role: z.literal("user"), content: z.string() });
const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable(),
  tool_calls: z.array(ToolCallSchema).optional(),
});
const ToolMessageSchema = z.object({
  role: z.literal("tool"),
  tool_call_id: z.string(),
  content: z.string(),
});

const MessageSchema = z.discriminatedUnion("role", [
  UserMessageSchema,
  AssistantMessageSchema,
  ToolMessageSchema,
]);

const StateSchema = z.object({
  schema: z.string().max(200_000),
  relationships: z.string().max(200_000),
  assertions: z.string().max(200_000),
  expected: z.string().max(200_000),
});

const ToolSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  input_schema: z.record(z.string(), z.unknown()),
});

export const AiRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(200),
  state: StateSchema,
  tools: z.array(ToolSchema).max(MAX_CLIENT_TOOLS),
});

export type AiRequest = z.infer<typeof AiRequestSchema>;
