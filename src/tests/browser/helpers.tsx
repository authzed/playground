import { useMemo } from "react";

import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { CookiesProvider } from "react-cookie";
import { expect } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { FullPlayground } from "@/components/FullPlayground";
import { SettingsProvider } from "@/components/SettingsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeTestRouter() {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: FullPlayground,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
}

function TestApp() {
  const router = useMemo(() => makeTestRouter(), []);
  return (
    <>
      <Toaster />
      <CookiesProvider>
        <ThemeProvider>
          <SettingsProvider>
            <TooltipProvider delayDuration={400}>
              <RouterProvider router={router} />
            </TooltipProvider>
          </SettingsProvider>
        </ThemeProvider>
      </CookiesProvider>
    </>
  );
}

export async function mountPlayground() {
  await render(<TestApp />);
  await expect.element(page.getByRole("link", { name: /Discord/i }), { timeout: 15000 }).toBeVisible();
}

export async function clickTab(label: string) {
  await page.getByRole("tab", { name: label }).click();
}

export async function clickPanel(label: string) {
  await page.getByRole("button", { name: label }).click();
}

export async function waitForWasm(timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((window as any).runSpiceDBDeveloperRequest) return;
    await new Promise<void>((r) => setTimeout(r, 500));
  }
  throw new Error("WASM developer package not loaded within timeout");
}
