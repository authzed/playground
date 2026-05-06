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
import { PropsWithChildren, useEffect } from "react";
import { CookiesProvider } from "react-cookie";
import "react-reflex/styles.css";
import "typeface-roboto-mono/index.css"; // Import the Roboto Mono font.

import { ThemeProvider } from "@/components/ThemeProvider";
import { isEUVisitor, shouldOptOutCapturing } from "@/lib/consent";

import "./App.css";
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

const routeTree = rootRoute.addChildren([indexRoute, inlineRoute]);
const router = createRouter({ routeTree });

const config = AppConfig();

function PHProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (config.posthog.apiKey && config.posthog.host) {
      const optOut = shouldOptOutCapturing(isEUVisitor());

      posthog.init(config.posthog.apiKey, {
        api_host: config.posthog.host,
        person_profiles: "identified_only",
        cross_subdomain_cookie: true,
        defaults: "2025-11-30",
        opt_out_capturing_by_default: optOut,
        opt_out_persistence_by_default: optOut,
        cookieless_mode: "on_reject",
      });

      // cookieless_mode "on_reject" treats PENDING consent as opted-out and
      // non-capturing. Move every visitor out of PENDING so that opted-out
      // users get cookieless tracking and opted-in users get full tracking.
      if (optOut) {
        posthog.opt_out_capturing();
      } else if (!posthog.has_opted_in_capturing()) {
        posthog.opt_in_capturing();
      }
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

function App() {
  // Register GA hook.
  useGoogleAnalytics(config.ga.measurementId);

  const isEmbeddedPlayground = window.location.pathname.indexOf("/e/") >= 0;
  return (
    <>
      <Toaster />
      {/* @ts-ignore-error react-cookie's types are screwy; CI and (local and vercel) disagree about whether there's an error or not. */}
      <CookiesProvider>
        <PHProvider>
          <ThemeProvider>
            <PlaygroundUIThemed {...PLAYGROUND_UI_COLORS} forceDarkMode={isEmbeddedPlayground}>
              <ConfirmDialogProvider>
                <RouterProvider router={router} />
              </ConfirmDialogProvider>
            </PlaygroundUIThemed>
          </ThemeProvider>
        </PHProvider>
      </CookiesProvider>
    </>
  );
}

export default App;
