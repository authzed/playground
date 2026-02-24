import { page } from "@vitest/browser/context";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clickTab,
  dismissTour,
  locator,
  mountPlayground,
  unmountPlayground,
  waitForWasm,
} from "./helpers";

describe("Playground", () => {
  beforeEach(async () => {
    await mountPlayground();
  });
  afterEach(async () => {
    await unmountPlayground();
  });

  it("displays tutorial", async () => {
    await expect
      .element(locator(".react-joyride__tooltip").getByText("Welcome!"))
      .toBeVisible();
  });

  it("can dismiss tutorial", async () => {
    await page.getByText("Skip").click();
    await unmountPlayground();
    await mountPlayground();
    await expect.element(page.getByText("Welcome!")).not.toBeInTheDocument();
  });

  it("displays header buttons", async () => {
    await dismissTour();
    await expect
      .element(page.getByRole("link", { name: /Discuss on Discord/i }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: "Select Example Schema" })
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Share" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Download" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Load From File" }))
      .toBeVisible();
    await expect
      .element(page.getByText("Sign In To Import"))
      .toBeVisible();
  });

  it("default validation succeeds", async () => {
    await dismissTour();
    await waitForWasm();
    await clickTab("Assertions");
    await page.getByRole("button", { name: "Run" }).click();
    await expect
      .element(page.getByText("Validated!"), { timeout: 15000 })
      .toBeVisible();
  });
});
