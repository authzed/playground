import { beforeEach, describe, expect, it } from "vitest";

import { mountPlayground } from "./helpers";

describe("FullPlayground announcement bar", () => {
  beforeEach(() => localStorage.clear());

  it("shows the announcement region and dismisses it", async () => {
    const screen = await mountPlayground();
    const region = screen.getByRole("region", { name: "Announcement" });
    await expect.element(region).toBeVisible();
    await screen.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect.element(region).not.toBeInTheDocument();
  });
});
