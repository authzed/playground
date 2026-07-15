import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { AssistantMessage } from "../../components/panels/assistant/AssistantMessage";
import type { DisplayMessage } from "../../services/assistant/store";
import type { LocalParseService } from "../../services/localparse";

// Unused for messages without trace artifacts (only TraceCard reads it).
const localParse = {} as unknown as LocalParseService;

function assistantMsg(over: Partial<DisplayMessage>): DisplayMessage {
  return {
    id: "a1",
    role: "assistant",
    text: "",
    toolActivity: [],
    artifacts: [],
    state: "done",
    ...over,
  };
}

const chip = (summary: string) => ({ name: "edit_document", summary, ok: true });
const diff = (target: string) => ({ kind: "diff" as const, target, before: "a", after: "b" });

describe("AssistantMessage collapse behavior", () => {
  it("collapses more than one tool chip into an 'Actions taken' expando when done", async () => {
    const screen = await render(
      <AssistantMessage
        localParseService={localParse}
        message={assistantMsg({
          toolActivity: [chip("Updated schema."), chip("edited"), chip("edited")],
        })}
      />,
    );
    await expect.element(screen.getByText(/Actions taken \(3\)/)).toBeInTheDocument();
  });

  it("collapses more than one diff into a single 'Changes made' expando", async () => {
    const screen = await render(
      <AssistantMessage
        localParseService={localParse}
        message={assistantMsg({ artifacts: [diff("schema"), diff("relationships")] })}
      />,
    );
    await expect.element(screen.getByText(/Changes made \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Changes made/).elements()).toHaveLength(1);
  });

  it("leaves a single diff inline (no 'Changes made' group)", async () => {
    const screen = await render(
      <AssistantMessage
        localParseService={localParse}
        message={assistantMsg({ artifacts: [diff("schema")] })}
      />,
    );
    await expect.element(screen.getByText(/what changed \(schema\)/)).toBeInTheDocument();
    expect(screen.getByText(/Changes made/).elements()).toHaveLength(0);
  });

  it("does not collapse on error — actions stay visible so the failure is legible", async () => {
    const screen = await render(
      <AssistantMessage
        localParseService={localParse}
        message={assistantMsg({
          state: "error",
          errorText: "boom",
          toolActivity: [chip("edited"), chip("edited")],
        })}
      />,
    );
    await expect.element(screen.getByText(/Failed/)).toBeInTheDocument();
    expect(screen.getByText(/Actions taken/).elements()).toHaveLength(0);
  });
});
