import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useModifierKeyHeld } from "@/hooks/use-modifier-key-held";

describe("useModifierKeyHeld", () => {
  it("starts false", async () => {
    const { result } = await renderHook(() => useModifierKeyHeld());
    expect(result.current).toBe(false);
  });

  it("becomes true on a meta keydown and false on release", async () => {
    const { result } = await renderHook(() => useModifierKeyHeld());

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta", metaKey: true }));
    await expect.poll(() => result.current).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Meta", metaKey: false, ctrlKey: false }),
    );
    await expect.poll(() => result.current).toBe(false);
  });

  it("becomes true on a ctrl keydown", async () => {
    const { result } = await renderHook(() => useModifierKeyHeld());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
    await expect.poll(() => result.current).toBe(true);
  });

  it("resets to false on window blur", async () => {
    const { result } = await renderHook(() => useModifierKeyHeld());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
    await expect.poll(() => result.current).toBe(true);

    window.dispatchEvent(new Event("blur"));
    await expect.poll(() => result.current).toBe(false);
  });
});
