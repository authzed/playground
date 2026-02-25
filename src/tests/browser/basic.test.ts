import { describe, expect, it } from "vitest";

import {
  clickTab,
  dismissTour,
  setupPlayground,
  waitForWasm,
} from "./helpers";

describe("Playground", () => {
  it("displays tutorial", async () => {
    const screen = await setupPlayground()
    await expect
      .element(screen.getByText("Welcome!"))
      .toBeVisible();
  });

  it("can dismiss tutorial", async () => {
    const screen = await setupPlayground()
    await screen.getByText("Skip").click();
    await expect.element(screen.getByText("Welcome!")).not.toBeInTheDocument();
  });

  it("displays header buttons", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await expect
      .element(screen.getByRole("link", { name: /Discuss on Discord/i }))
      .toBeVisible();
    await expect
      .element(
        screen.getByText("Select Example Schema")
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Share" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Download" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Load From File" }))
      .toBeVisible();
  });

  it("default validation succeeds", async () => {
    const screen = await setupPlayground()
    await dismissTour(screen);
    await waitForWasm();
    await clickTab(screen, "Assertions");
    await screen.getByRole("button", { name: "Run" }).click();
    await expect
      .element(screen.getByText("Validated!"), { timeout: 15000 })
      .toBeVisible();
  });
});
