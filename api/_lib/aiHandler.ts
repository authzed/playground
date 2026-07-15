import { buildSystemBlocks, buildToolDefs } from "./anthropic";
import type { AiRequest } from "./schema";
import { SERVER_TOOLS, SERVER_TOOL_NAMES } from "./serverTools";
import type { SseSink } from "./sse";

export interface ContentBlock {
  type: string;
  [k: string]: unknown;
}
export interface FinalMessage {
  content: ContentBlock[];
  stop_reason: string;
}
export interface AnthropicStreamLike {
  on(event: "text", cb: (delta: string) => void): void;
  finalMessage(): Promise<FinalMessage>;
}
export interface AnthropicLike {
  stream(params: unknown): AnthropicStreamLike;
}

interface ToolUseBlock extends ContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

function isToolUse(b: ContentBlock): b is ToolUseBlock {
  return b.type === "tool_use";
}

export async function runAiTurn(
  req: AiRequest,
  deps: { anthropic: AnthropicLike; model: string; maxTokens: number; maxRoundTrips: number },
  sink: SseSink,
): Promise<void> {
  const system = buildSystemBlocks(req.state);
  const tools = buildToolDefs(req.tools);
  const messages: { role: string; content: unknown }[] = [...req.messages];

  // When only server tools run, the loop continues within this one client stream,
  // so text from several model round-trips arrives back-to-back. Insert a paragraph
  // break before each later trip's first text so the blocks don't run together
  // (mirrors the client-side separator that spans client-tool round-trips).
  let hasEmittedText = false;

  for (let trip = 0; trip < deps.maxRoundTrips; trip++) {
    let tripEmittedText = false;
    const stream = deps.anthropic.stream({
      model: deps.model,
      max_tokens: deps.maxTokens,
      system,
      tools,
      messages,
    });
    stream.on("text", (delta) => {
      const prefix = !tripEmittedText && hasEmittedText ? "\n\n" : "";
      tripEmittedText = true;
      hasEmittedText = true;
      sink.send("text", { delta: prefix + delta });
    });
    const final = await stream.finalMessage();

    messages.push({ role: "assistant", content: final.content });

    const toolUses = final.content.filter(isToolUse);
    if (toolUses.length === 0) {
      sink.send("done", { assistantContent: final.content, stop_reason: final.stop_reason });
      sink.end();
      return;
    }

    const serverUses = toolUses.filter((u) => SERVER_TOOL_NAMES.has(u.name));
    const clientUses = toolUses.filter((u) => !SERVER_TOOL_NAMES.has(u.name));

    const serverToolResults = serverUses.map((u) => {
      const tool = SERVER_TOOLS.find((t) => t.name === u.name)!;
      return { tool_use_id: u.id, content: tool.execute(u.input) };
    });

    if (clientUses.length > 0) {
      sink.send("handoff", {
        assistantContent: final.content,
        serverToolResults,
        clientToolCalls: clientUses.map((u) => ({ id: u.id, name: u.name, input: u.input })),
      });
      sink.end();
      return;
    }

    // Only server tools: append their results and continue the loop.
    messages.push({
      role: "user",
      content: serverToolResults.map((r) => ({
        type: "tool_result",
        tool_use_id: r.tool_use_id,
        content: r.content,
      })),
    });
  }

  sink.send("error", { code: "step_limit", message: "Reached the maximum number of tool steps." });
  sink.end();
}
