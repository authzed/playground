import { PostHogProvider } from "@posthog/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import posthog from "posthog-js";
import { useMemo } from "react";
import { CookiesProvider } from "react-cookie";
import { expect } from "vitest";
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
        {/* Mirrors App.tsx's PHProvider: the real app always wraps in a
            PostHogProvider, even when posthog.init() is skipped (no env
            vars) — components calling usePostHog() must always find one. */}
        <PostHogProvider client={posthog}>
          <ThemeProvider>
            <SettingsProvider>
              <TooltipProvider delayDuration={400}>
                <RouterProvider router={router} />
              </TooltipProvider>
            </SettingsProvider>
          </ThemeProvider>
        </PostHogProvider>
      </CookiesProvider>
    </>
  );
}

export async function mountPlayground() {
  const screen = await render(<TestApp />);
  await expect.element(screen.getByText("Download")).toBeVisible();
  return screen;
}

export function waitForWasm() {
  expect.poll(() => {
    expect(window.runSpiceDBDeveloperRequest).toBeTruthy();
  });
}
