import { describe, expect, it } from "vitest";

import { mountPlayground, waitForWasm } from "./helpers";

describe("Navigation", () => {
  it("displays schema tab", async () => {
    const screen = await mountPlayground();
    await screen.getByRole("tab", { name: "Schema" }).click();
    await expect.element(screen.getByText("definition user {}")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Format" })).toBeVisible();
  });

  it("displays relationships tab", async () => {
    const screen = await mountPlayground();
    await screen.getByRole("tab", { name: "Relationships" }).click();
    await expect.element(screen.getByTitle("Grid Editor")).toBeVisible();
    await screen.getByTitle("Text Editor").click();
    // NOTE: this is how we indirectly reference the monaco editor, since it's hard to
    // reference the text contents of the editor in playwright.
    await expect.element(screen.getByRole("presentation")).toBeVisible();
  });

  it("displays assertions tab", async () => {
    const screen = await mountPlayground();
    await screen.getByRole("tab", { name: "Assertions" }).click();
    await expect.element(screen.getByText("assertTrue")).toBeVisible();
    await expect.element(screen.getByText("Validation not run")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Run" })).toBeVisible();
  });

  it("displays expected relations tab", async () => {
    const screen = await mountPlayground();
    await screen.getByRole("tab", { name: "Expected Relations" }).click();
    await expect.element(screen.getByText("Validation not run")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Run" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Re-Generate" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Compute and Diff" })).toBeVisible();
  });

  it("displays panels", async () => {
    const screen = await mountPlayground();
    waitForWasm();
    // NOTE: these buttons are unlabeled (no title or anything) but have
    // tooltips associated with them. It may make sense to use title directly here.
    await screen.getByLabelText("problems panel trigger").click();
    await expect.element(screen.getByText("Problems")).toBeVisible();
    await screen.getByLabelText("watches panel trigger").click();
    await expect.element(screen.getByText("Check Watches")).toBeVisible();
  });
});
