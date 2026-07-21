import { buildSystemMessage, buildToolDefs } from "./openrouter.js";
import type { OpenRouterFinalMessage, OpenRouterLike, OpenRouterMessage } from "./openrouterClient.js";
import { ParagraphBreakTracker } from "./paragraphBreak.js";
import type { AiRequest } from "./schema.js";
import { SERVER_TOOLS, SERVER_TOOL_NAMES } from "./serverTools.js";
import type { SseSink } from "./sse.js";

export async function runAiTurn(
  req: AiRequest,
  deps: { client: OpenRouterLike; model: string; maxTokens: number; maxRoundTrips: number },
  sink: SseSink,
): Promise<void> {
  const system = buildSystemMessage(req.state);
  const tools = buildToolDefs(req.tools);
  const messages: OpenRouterMessage[] = [system, ...req.messages];

  // The model emits text across multiple round trips (a block of text, then tool
  // calls, then more text) that get appended into one conversation, so insert a
  // paragraph break before each later trip's first text so the blocks don't run
  // together (mirrors the client-side separator that spans client-tool round-trips).
  const paragraphBreaks = new ParagraphBreakTracker();

  for (let trip = 0; trip < deps.maxRoundTrips; trip++) {
    paragraphBreaks.nextTrip();
    const stream = deps.client.stream({
      model: deps.model,
      max_tokens: deps.maxTokens,
      messages,
      tools,
    });
    stream.on("text", (delta) => {
      sink.send("text", { delta: paragraphBreaks.apply(delta) });
    });
    const final: OpenRouterFinalMessage = await stream.finalMessage();

    messages.push(final.message);

    const toolCalls = final.message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      sink.send("done", { assistantMessage: final.message, finish_reason: final.finish_reason });
      sink.end();
      return;
    }

    // Tool calls whose arguments fail to parse can't be safely executed or
    // handed to the client — synthesize an explicit failure result instead of
    // substituting {} and letting the tool run with silently-wrong input.
    const malformedResults: OpenRouterMessage[] = [];
    const parsedArguments = new Map<string, unknown>();
    for (const c of toolCalls) {
      const parsed = parseArguments(c.function.arguments);
      if (parsed.ok) {
        parsedArguments.set(c.id, parsed.value);
      } else {
        malformedResults.push({
          role: "tool",
          tool_call_id: c.id,
          content: `Malformed arguments for tool "${c.function.name}": ${parsed.error}. The call was not executed.`,
        });
      }
    }
    const validCalls = toolCalls.filter((c) => parsedArguments.has(c.id));
    const serverCalls = validCalls.filter((c) => SERVER_TOOL_NAMES.has(c.function.name));
    const clientCalls = validCalls.filter((c) => !SERVER_TOOL_NAMES.has(c.function.name));

    const serverToolResults: OpenRouterMessage[] = [
      ...malformedResults,
      ...serverCalls.map((c) => {
        const tool = SERVER_TOOLS.find((t) => t.name === c.function.name)!;
        return { role: "tool" as const, tool_call_id: c.id, content: tool.execute(parsedArguments.get(c.id)) };
      }),
    ];

    if (clientCalls.length > 0) {
      sink.send("handoff", {
        assistantMessage: final.message,
        serverToolResults,
        clientToolCalls: clientCalls.map((c) => ({
          id: c.id,
          name: c.function.name,
          input: parsedArguments.get(c.id),
        })),
      });
      sink.end();
      return;
    }

    // Only server tools (and/or malformed-call failures): append results and continue the loop.
    messages.push(...serverToolResults);
  }

  sink.send("error", { code: "step_limit", message: "Reached the maximum number of tool steps." });
  sink.end();
}

function parseArguments(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
