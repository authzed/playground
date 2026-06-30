import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { useDismissible } from "@/hooks/use-dismissible";

const KEY = "announcement-bar:dismissed";

function Harness({ id }: { id: string }) {
  const { dismissed, dismiss, reset } = useDismissible(id);
  return (
    <div>
      <span data-testid="state">{dismissed ? "dismissed" : "visible"}</span>
      <button type="button" onClick={dismiss}>
        dismiss
      </button>
      <button type="button" onClick={reset}>
        reset
      </button>
    </div>
  );
}

describe("useDismissible", () => {
  beforeEach(() => localStorage.clear());

  it("starts visible for a new id", async () => {
    const screen = await render(<Harness id="a" />);
    await expect.element(screen.getByTestId("state")).toHaveTextContent("visible");
  });

  it("dismiss() flips state and persists the id", async () => {
    const screen = await render(<Harness id="a" />);
    await screen.getByRole("button", { name: "dismiss" }).click();
    await expect.element(screen.getByTestId("state")).toHaveTextContent("dismissed");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toContain("a");
  });

  it("a different id still shows after another was dismissed", async () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    const screen = await render(<Harness id="b" />);
    await expect.element(screen.getByTestId("state")).toHaveTextContent("visible");
  });

  it("reset() clears the id", async () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    const screen = await render(<Harness id="a" />);
    await expect.element(screen.getByTestId("state")).toHaveTextContent("dismissed");
    await screen.getByRole("button", { name: "reset" }).click();
    await expect.element(screen.getByTestId("state")).toHaveTextContent("visible");
    expect(JSON.parse(localStorage.getItem(KEY)!)).not.toContain("a");
  });

  it("handles corrupt storage without throwing", async () => {
    localStorage.setItem(KEY, "{not json");
    const screen = await render(<Harness id="a" />);
    await expect.element(screen.getByTestId("state")).toHaveTextContent("visible");
  });
});
