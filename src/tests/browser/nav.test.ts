import { page } from "@vitest/browser/context";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clickPanel,
  clickTab,
  dismissTour,
  editorLocator,
  locator,
  mountPlayground,
  panelContentLocator,
  unmountPlayground,
  waitForWasm,
} from "./helpers";

describe("Navigation", () => {
  beforeEach(async () => {
    await mountPlayground();
    await dismissTour();
  });
  afterEach(async () => {
    await unmountPlayground();
  });

  it("displays schema tab", async () => {
    await clickTab("Schema");
    await expect
      .element(editorLocator().getByText("definition user {}"))
      .toBeVisible();
    await expect
      .element(editorLocator().getByText("definition resource {"))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Format" }))
      .toBeVisible();
  });

  it("displays relationships tab", async () => {
    await clickTab("Test Relationships");
    await expect
      .element(locator('[aria-label="relationship editor view"]'))
      .toBeVisible();
    await expect
      .element(page.getByText("Highlight same types, objects and relations"))
      .toBeVisible();
    await locator('[aria-label="code editor"]').click();
    await expect
      .element(
        editorLocator().getByText(
          "resource:anotherresource#writer@user:somegal"
        )
      )
      .toBeVisible();
  });

  it("displays assertions tab", async () => {
    await clickTab("Assertions");
    await expect
      .element(editorLocator().getByText("assertTrue"))
      .toBeVisible();
    await expect
      .element(editorLocator().getByText("assertFalse"))
      .toBeVisible();
    await expect
      .element(page.getByText("Validation not run"))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Run" }))
      .toBeVisible();
  });

  it("displays expected relations tab", async () => {
    await clickTab("Expected Relations");
    await expect
      .element(page.getByText("Validation not run"))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Run" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Re-Generate" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Compute and Diff" }))
      .toBeVisible();
  });

  it("displays panels", async () => {
    await waitForWasm();
    await clickPanel("Problems");
    await expect
      .element(panelContentLocator().getByText("No problems found"))
      .toBeVisible();
    await clickPanel("Check Watches");
    await expect
      .element(panelContentLocator().locator("table.MuiTable-root"))
      .toBeVisible();
    await clickPanel("System Visualization");
    await expect
      .element(panelContentLocator().locator("div.vis-network"))
      .toBeVisible();
    await clickPanel("Last Validation Run");
    await expect
      .element(panelContentLocator().getByText("Validation Not Run"))
      .toBeVisible();
  });
});
