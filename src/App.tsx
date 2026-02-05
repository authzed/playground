import "react-reflex/styles.css";
import "typeface-roboto-mono/index.css"; // Import the Roboto Mono font.
import "./App.css";

import { PostHogProvider } from "@posthog/react";
import {
  Outlet,
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import posthog from "posthog-js";

import { ThemeProvider } from "@/components/ThemeProvider";

import { EmbeddedPlayground } from "./components/EmbeddedPlayground";
import { FullPlayground } from "./components/FullPlayground";
import { InlinePlayground } from "./components/InlinePlayground";
import { Toaster } from "./components/ui/sonner";
import { ConfirmDialogProvider } from "./playground-ui/ConfirmDialogProvider";
import { useGoogleAnalytics } from "./playground-ui/GoogleAnalyticsHook";
import PlaygroundUIThemed from "./playground-ui/PlaygroundUIThemed";
import AppConfig from "./services/configservice";
import { PLAYGROUND_UI_COLORS } from "./theme";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});

// TODO: extend the routing; the $s are catchalls.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: FullPlayground,
});
const inlineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/i/$",
  component: InlinePlayground,
});
const embeddedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e/$",
  component: EmbeddedPlayground,
});

const routeTree = rootRoute.addChildren([indexRoute, inlineRoute, embeddedRoute]);
const router = createRouter({ routeTree });

const config = AppConfig();
if (config.posthog.apiKey && config.posthog.host) {
  posthog.init(config.posthog.apiKey, {
    api_host: config.posthog.host,
    person_profiles: "identified_only",
    defaults: "2025-11-30", // Enables automatic SPA pageview tracking via history API
  });
}

function App() {
  // Register GA hook.
  useGoogleAnalytics(config.ga.measurementId);

  const isEmbeddedPlayground = window.location.pathname.indexOf("/e/") >= 0;
  return (
    <>
      <Toaster />
      <PostHogProvider client={posthog}>
        <ThemeProvider>
          <PlaygroundUIThemed {...PLAYGROUND_UI_COLORS} forceDarkMode={isEmbeddedPlayground}>
            <ConfirmDialogProvider>
              <RouterProvider router={router} />
            </ConfirmDialogProvider>
          </PlaygroundUIThemed>
        </ThemeProvider>
      </PostHogProvider>
    </>
  );
}

export default App;
