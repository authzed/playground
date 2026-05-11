import { describe, expect, it } from "vitest";

import { mountPlayground, waitForWasm } from "./helpers";

describe("Playground", () => {
  it("displays header buttons", async () => {
    const screen = await mountPlayground();
    // NOTE: we only assert on the buttons that are going to be present in all configurations -
    // discord and share won't necessarily.
    await expect.element(screen.getByRole("button", { name: /Download/i })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Load From File/i })).toBeVisible();
  });

  it("default validation succeeds", async () => {
    const screen = await mountPlayground();
    waitForWasm();
    await screen.getByRole("tab", { name: "Assertions" }).click();
    await screen.getByRole("button", { name: "Run" }).click();
    await expect.element(screen.getByText("Validated!"), { timeout: 15000 }).toBeVisible();
  });
});
