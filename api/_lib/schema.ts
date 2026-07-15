import z from "zod";

export const MAX_CLIENT_TOOLS = 64;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

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
