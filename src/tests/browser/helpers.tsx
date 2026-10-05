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
import { useMemo, type ReactNode } from "react";
import { CookiesProvider } from "react-cookie";
import { expect } from "vitest";
import { render } from "vitest-browser-react";

import { FullPlayground, ThemedAppView } from "@/components/FullPlayground";
import { SettingsProvider } from "@/components/SettingsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useLiveCheckService } from "../../services/check";
import type { DataStore } from "../../services/datastore";
import { useDeveloperService } from "../../spicedb-common/services/developerservice";

function makeTestRouter(component: () => ReactNode) {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
}

function TestApp({ component = FullPlayground }: { component?: () => ReactNode }) {
  const router = useMemo(() => makeTestRouter(component), [component]);
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

/**
 * Mirrors the real app's wiring, but against a caller-supplied datastore rather than the
 * local-storage-backed one. Local storage is shared across the whole origin, so tests that
 * mount the normal playground inherit — and leak — each other's documents.
 */
function InjectedPlayground({ datastore }: { datastore: DataStore }) {
  const developerService = useDeveloperService();
  const liveCheckService = useLiveCheckService(developerService, datastore, { persist: false });
  return (
    <ThemedAppView
      datastore={datastore}
      developerService={developerService}
      liveCheckService={liveCheckService}
    />
  );
}

/**
 * mountPlaygroundWithStore renders the playground against the given datastore, touching no
 * persistent storage. Use it for anything that edits documents.
 */
export async function mountPlaygroundWithStore(datastore: DataStore) {
  const component = () => <InjectedPlayground datastore={datastore} />;
  const screen = await render(<TestApp component={component} />);
  await expect.element(screen.getByText("Download")).toBeVisible();
  return screen;
}

/**
 * Resolves once the WASM developer package has registered itself. Must be awaited — the
 * previous version built an `expect.poll` without a matcher and returned immediately, so
 * callers were racing the WASM download rather than waiting for it.
 */
export async function waitForWasm() {
  await expect
    .poll(() => window.runSpiceDBDeveloperRequest !== undefined, { timeout: 60000 })
    .toBe(true);
}
