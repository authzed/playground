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
    // Paired by array position, never by call.id — ids aren't guaranteed
    // unique across the calls in one turn, and keying by id let one call's
    // arguments silently overwrite another's.
    const outcomes = toolCalls.map((call) => ({ call, parsed: parseArguments(call.function.arguments) }));

    const malformedResults: OpenRouterMessage[] = [];
    const malformedClientToolCalls: { id: string; name: string; error: string }[] = [];
    for (const o of outcomes) {
      if (o.parsed.ok) continue;
      malformedResults.push({
        role: "tool",
        tool_call_id: o.call.id,
        content: `Malformed arguments for tool "${o.call.function.name}": ${o.parsed.error}. The call was not executed.`,
      });
      if (!SERVER_TOOL_NAMES.has(o.call.function.name)) {
        malformedClientToolCalls.push({ id: o.call.id, name: o.call.function.name, error: o.parsed.error });
      }
    }

    const validOutcomes = outcomes.filter(
      (o): o is { call: (typeof outcomes)[number]["call"]; parsed: { ok: true; value: unknown } } => o.parsed.ok,
    );
    const serverOutcomes = validOutcomes.filter((o) => SERVER_TOOL_NAMES.has(o.call.function.name));
    const clientOutcomes = validOutcomes.filter((o) => !SERVER_TOOL_NAMES.has(o.call.function.name));

    const serverToolResults: OpenRouterMessage[] = [
      ...malformedResults,
      ...serverOutcomes.map((o) => {
        const tool = SERVER_TOOLS.find((t) => t.name === o.call.function.name)!;
        return { role: "tool" as const, tool_call_id: o.call.id, content: tool.execute(o.parsed.value) };
      }),
    ];

    if (clientOutcomes.length > 0 || malformedClientToolCalls.length > 0) {
      sink.send("handoff", {
        assistantMessage: final.message,
        serverToolResults,
        clientToolCalls: clientOutcomes.map((o) => ({
          id: o.call.id,
          name: o.call.function.name,
          input: o.parsed.value,
        })),
        malformedClientToolCalls,
      });
      sink.end();
      return;
    }

    // Only server tools (and/or malformed server-named-call failures): append results and continue the loop.
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
