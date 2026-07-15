import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { DiffCard } from "../../components/panels/assistant/DiffCard";
import { Markdown } from "../../components/panels/assistant/Markdown";
import { ToolActivityChip } from "../../components/panels/assistant/ToolActivityChip";

describe("assistant leaf components", () => {
  it("renders markdown to HTML", async () => {
    const screen = await render(<Markdown>{"**bold** text"}</Markdown>);
    await expect.element(screen.getByText("bold")).toBeInTheDocument();
  });

  it("renders a tool chip summary", async () => {
    const screen = await render(
      <ToolActivityChip activity={{ name: "run_check", summary: "check ⟹ allowed", ok: true }} />,
    );
    await expect.element(screen.getByText(/allowed/)).toBeInTheDocument();
  });

  it("renders a diff card and fires onUndo", async () => {
    let undone = false;
    const screen = await render(
      <DiffCard
        diff={{ target: "schema", before: "a", after: "b" }}
        onUndo={() => (undone = true)}
      />,
    );
    await screen.getByRole("button", { name: /undo/i }).click();
    expect(undone).toBe(true);
  });
});
