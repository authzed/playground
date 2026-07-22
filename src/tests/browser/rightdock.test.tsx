import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { DockActivityBar } from "../../components/rightdock/DockActivityBar";
import { RightDock } from "../../components/rightdock/RightDock";
import { useRightDockStore } from "../../components/rightdock/state";
import { TooltipProvider } from "../../components/ui/tooltip";

beforeEach(() => {
  useRightDockStore.setState({ open: false, activePanel: null });
});

describe("DockActivityBar", () => {
  it("hides the Assistant button when AI is disabled but keeps History", async () => {
    const screen = await render(
      <TooltipProvider>
        <DockActivityBar aiEnabled={false} />
      </TooltipProvider>,
    );
    await expect.element(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assistant" }).elements()).toHaveLength(0);
  });

  it("shows both buttons when AI is enabled", async () => {
    const screen = await render(
      <TooltipProvider>
        <DockActivityBar aiEnabled={true} />
      </TooltipProvider>,
    );
    await expect.element(screen.getByRole("button", { name: "Assistant" })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
  });
});

describe("RightDock", () => {
  it("renders the active panel's content", async () => {
    useRightDockStore.setState({ open: true, activePanel: "history" });
    const screen = await render(<RightDock panels={{ history: <div>history-body</div> }} />);
    await expect.element(screen.getByText("history-body")).toBeInTheDocument();
  });

  it("renders nothing when the active panel is unavailable (e.g. assistant while AI is off)", async () => {
    useRightDockStore.setState({ open: true, activePanel: "assistant" });
    const screen = await render(<RightDock panels={{ history: <div>history-body</div> }} />);
    expect(screen.getByText("history-body").elements()).toHaveLength(0);
  });
});
