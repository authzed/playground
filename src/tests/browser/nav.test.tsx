import { beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { clickPanel, clickTab, mountPlayground, waitForWasm } from "./helpers";

describe("Navigation", () => {
  beforeEach(async () => {
    await mountPlayground();
  });

  it("displays schema tab", async () => {
    await clickTab("Schema");
    await expect.element(page.getByText("definition user {}")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Format" })).toBeVisible();
  });

  it("displays relationships tab", async () => {
    await clickTab("Relationships");
    await expect.element(page.getByRole("button", { name: "relationship editor view" })).toBeVisible();
    await page.getByRole("button", { name: "code editor" }).click();
    await expect.element(page.getByText("resource:anotherresource#writer@user:somegal")).toBeVisible();
  });

  it("displays assertions tab", async () => {
    await clickTab("Assertions");
    await expect.element(page.getByText("assertTrue")).toBeVisible();
    await expect.element(page.getByText("Validation not run")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Run" })).toBeVisible();
  });

  it("displays expected relations tab", async () => {
    await clickTab("Expected Relations");
    await expect.element(page.getByText("Validation not run")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Run" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Re-Generate" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Compute and Diff" })).toBeVisible();
  });

  it("displays panels", async () => {
    await waitForWasm();
    await clickPanel("Problems");
    await expect.element(page.getByText("No problems found")).toBeVisible();
    await clickPanel("Check Watches");
    await expect.element(page.getByRole("table")).toBeVisible();
  });
});
