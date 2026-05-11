import { beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { clickTab, mountPlayground, waitForWasm } from "./helpers";

describe("Playground", () => {
  beforeEach(async () => {
    await mountPlayground();
  });

  it("displays header buttons", async () => {
    await expect.element(page.getByRole("link", { name: /Discord/i })).toBeVisible();
    await expect.element(page.getByRole("button", { name: /Share/i })).toBeVisible();
    await expect.element(page.getByRole("button", { name: /Download/i })).toBeVisible();
    await expect.element(page.getByRole("button", { name: /Load From File/i })).toBeVisible();
  });

  it("default validation succeeds", async () => {
    await waitForWasm();
    await clickTab("Assertions");
    await page.getByRole("button", { name: "Run" }).click();
    await expect.element(page.getByText("Validated!"), { timeout: 15000 }).toBeVisible();
  });
});
