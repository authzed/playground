import { render, type RenderResult } from 'vitest-browser-react'
import { StrictMode } from "react";
import { vi } from "vitest";

import App from "@/App";

export function setupPlayground() {
  // TODO: see if this breaks parallel tests because it's shared state
  // Reset state between tests
  document.cookie =
    "dismiss-tour=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  localStorage.clear();

  return render(
    <StrictMode>
      <App />
    </StrictMode>
    );
}

export async function dismissTour(screen: RenderResult) {
  await screen.getByText("Skip").click();
}

export async function clickTab(screen: RenderResult, label: string): Promise<void> {
  await screen.getByLabelText("Tabs").getByText(label).click();
}

export async function clickPanel(screen: RenderResult, label: string): Promise<void> {
  await screen.getByRole("button", { name: label }).click();
}

export async function waitForWasm(): Promise<void> {
  await vi.waitFor(
    () => {
      const w = window as typeof window & {
        runSpiceDBDeveloperRequest?: unknown;
      };
      if (typeof w.runSpiceDBDeveloperRequest !== "function") {
        throw new Error("WASM not loaded");
      }
    },
    { timeout: 30000, interval: 500 }
  );
}
