import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AnnouncementBar } from "@/components/announcement-bar";

const KEY = "announcement-bar:dismissed";

describe("AnnouncementBar", () => {
  beforeEach(() => localStorage.clear());

  it("renders its children", async () => {
    const screen = await render(
      <AnnouncementBar contentId="t1">Hello announcement</AnnouncementBar>,
    );
    await expect.element(screen.getByText("Hello announcement")).toBeVisible();
  });

  it("dismiss hides the bar, persists, and calls onDismiss", async () => {
    const onDismiss = vi.fn();
    const screen = await render(
      <AnnouncementBar contentId="t2" onDismiss={onDismiss}>
        Bye
      </AnnouncementBar>,
    );
    await screen.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect.element(screen.getByText("Bye")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toContain("t2");
  });

  it("renders nothing for an already-dismissed contentId", async () => {
    localStorage.setItem(KEY, JSON.stringify(["t3"]));
    const screen = await render(<AnnouncementBar contentId="t3">Should not show</AnnouncementBar>);
    await expect.element(screen.getByText("Should not show")).not.toBeInTheDocument();
  });

  it("applies the selected variant", async () => {
    const screen = await render(
      <AnnouncementBar contentId="t4" variant="brand">
        Branded
      </AnnouncementBar>,
    );
    await expect
      .element(screen.getByRole("region", { name: "Announcement" }))
      .toHaveAttribute("data-variant", "brand");
  });

  it("includes the spacer by default and omits it when reserveSpace is false", async () => {
    const withSpacer = await render(<AnnouncementBar contentId="t5">With spacer</AnnouncementBar>);
    await expect.element(withSpacer.getByText("With spacer")).toBeVisible();
    expect(document.querySelector('[data-slot="announcement-bar-spacer"]')).not.toBeNull();
    await withSpacer.unmount();

    const noSpacer = await render(
      <AnnouncementBar contentId="t6" reserveSpace={false}>
        No spacer
      </AnnouncementBar>,
    );
    await expect.element(noSpacer.getByText("No spacer")).toBeVisible();
    expect(document.querySelector('[data-slot="announcement-bar-spacer"]')).toBeNull();
  });

  it("hides the close button when dismissible is false", async () => {
    const screen = await render(
      <AnnouncementBar contentId="t7" dismissible={false}>
        No close
      </AnnouncementBar>,
    );
    await expect.element(screen.getByText("No close")).toBeVisible();
    expect(document.querySelector('button[aria-label="Dismiss announcement"]')).toBeNull();
  });
});
