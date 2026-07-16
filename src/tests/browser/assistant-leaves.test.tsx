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

  it("renders a fenced schema code block with a language label", async () => {
    const screen = await render(<Markdown>{"```zed\ndefinition user {}\n```"}</Markdown>);
    // the language-tag label
    await expect.element(screen.getByText("schema")).toBeInTheDocument();
    // a highlighted schema keyword from the block body
    await expect.element(screen.getByText("definition")).toBeInTheDocument();
  });

  it("renders a GFM table", async () => {
    const md = "| Watch | Result |\n|---|---|\n| existing | allowed |\n| new | denied |";
    const screen = await render(<Markdown>{md}</Markdown>);
    await expect.element(screen.getByRole("table")).toBeInTheDocument();
    await expect.element(screen.getByText("Watch")).toBeInTheDocument();
    await expect.element(screen.getByText("allowed")).toBeInTheDocument();
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

  it("detects removing one of several duplicate lines as a real change", async () => {
    // Regression: a Set-based diff treated "a\na\nb" -> "a\nb" as no change at
    // all, since "a" was still present in both versions' Sets.
    const screen = await render(
      <DiffCard diff={{ target: "schema", before: "a\na\nb", after: "a\nb" }} />,
    );
    await screen.getByRole("button", { name: /what changed/i }).click();
    await expect.element(screen.getByText("- a")).toBeInTheDocument();
    await expect
      .element(screen.getByText(/whitespace or line-order change/))
      .not.toBeInTheDocument();
  });
});
