import { cleanup, render } from "@testing-library/react";
import { page } from "@vitest/browser/context";
import type { Locator } from "@vitest/browser/context";
import { Locator as LocatorBase, selectorEngine } from "@vitest/browser/locator";
import { createElement, StrictMode } from "react";
import { vi } from "vitest";

import App from "@/App";

// CssLocator extends the context Locator interface with chaining support
interface CssLocator extends Locator {
  locator(selector: string): CssLocator;
}

// Concrete implementation: extends the LocatorBase class from @vitest/browser/locator
// LocatorBase handles lazy DOM querying via selectorEngine.parseSelector() / querySelector()
// The >> separator is supported by Vitest's Ivya selector engine (extracted from Playwright)
class CSSLocatorImpl extends LocatorBase {
  public selector: string;

  constructor(selector: string) {
    super();
    this.selector = selector;
  }

  // Override as public (permitted: protected -> public increases accessibility)
  public locator(selector: string): CSSLocatorImpl {
    return new CSSLocatorImpl(`${this.selector} >> ${selector}`);
  }

  protected elementLocator(element: Element): CSSLocatorImpl {
    return new CSSLocatorImpl(selectorEngine.generateSelectorSimple(element));
  }
}

/** Creates a lazy CSS-selector-based locator. Actual DOM query is deferred to assertion time. */
export function locator(selector: string): CssLocator {
  return new CSSLocatorImpl(selector) as unknown as CssLocator;
}

export async function mountPlayground(): Promise<void> {
  // Reset state between tests
  document.cookie =
    "dismiss-tour=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  localStorage.clear();

  // App renders React portals into #portal (matches index.html structure)
  if (!document.getElementById("portal")) {
    const portal = document.createElement("div");
    portal.id = "portal";
    document.body.appendChild(portal);
  }

  render(createElement(StrictMode, null, createElement(App)));
}

export async function unmountPlayground(): Promise<void> {
  cleanup(); // @testing-library/react cleanup
  document.getElementById("portal")?.remove();
}

export async function dismissTour(): Promise<void> {
  await page.getByText("Skip").click();
}

export async function clickTab(label: string): Promise<void> {
  await locator("div[aria-label=Tabs]").getByText(label).click();
}

export async function clickPanel(label: string): Promise<void> {
  await page.getByRole("button", { name: label }).click();
}

export function editorLocator(): CssLocator {
  return locator(".monaco-editor");
}

export function panelContentLocator(): CssLocator {
  return locator("div[role=tabpanel] > div");
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
