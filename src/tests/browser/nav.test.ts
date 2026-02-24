import { describe, expect, it } from "vitest";

import {
  clickPanel,
  clickTab,
  dismissTour,
  setupPlayground,
  waitForWasm,
} from "./helpers";

describe("Navigation", () => {

  it("displays schema tab", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await clickTab(screen, "Schema");
    await expect
      .element(screen.getByText("definition user {}"))
      .toBeVisible();
    await expect
      .element(screen.getByText("definition resource {"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Format" }))
      .toBeVisible();
  });

  it("displays relationships tab", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await clickTab(screen, "Test Relationships");
    await expect
      .element(screen.getByText("Highlight same types, objects and relations"))
      .toBeVisible();
    await screen.getByRole("code").click();
    await expect
      .element(
        screen.getByText(
          "resource:anotherresource#writer@user:somegal"
        )
      )
      .toBeVisible();
  });

  it("displays assertions tab", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await clickTab(screen, "Assertions");
    await expect
      .element(screen.getByText("assertTrue"))
      .toBeVisible();
    await expect
      .element(screen.getByText("assertFalse"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Validation not run"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Run" }))
      .toBeVisible();
  });

  it("displays expected relations tab", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await clickTab(screen, "Expected Relations");
    await expect
      .element(screen.getByText("Validation not run"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Run" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Re-Generate" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Compute and Diff" }))
      .toBeVisible();
  });

  it("displays panels", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await waitForWasm();
    await clickPanel(screen, "Problems");
    await expect
      .element(screen.getByText("No problems found"))
      .toBeVisible();
    await clickPanel(screen, "Check Watches");
    await expect
      .element(screen.getByText("Checks not run"))
      .toBeVisible();
    await clickPanel(screen, "System Visualization");
    await expect
      .element(screen.getByLabelText("Control Panel"))
      .toBeVisible();
    await clickPanel(screen, "Last Validation Run");
    await expect
      .element(screen.getByText("Validation Not Run"))
      .toBeVisible();
  });
});
