import { PostHogProvider } from "@posthog/react";
import {
  Outlet,
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import posthog from "posthog-js";
import { PropsWithChildren, useEffect } from "react";
import { CookiesProvider } from "react-cookie";
import "typeface-roboto-mono/index.css"; // Import the Roboto Mono font.

import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { SettingsProvider } from "@/components/SettingsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isEUVisitor, shouldOptOutCapturing } from "@/lib/consent";

import "./App.css";
import { EmbeddedPlayground } from "@/components/EmbeddedPlayground";
import { FullPlayground } from "@/components/FullPlayground";
import { InlinePlayground } from "@/components/InlinePlayground";
import { Toaster } from "@/components/ui/sonner";
import { useGoogleAnalytics } from "@/playground-ui/GoogleAnalyticsHook";
import AppConfig from "@/services/configservice";
import { ShareLoader } from "@/components/ShareLoader";
import { ErrorComponent as ShareErrorComponent, shareLoader } from "@/loaders/share";
import LoadingView from "@/playground-ui/LoadingView";

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FullPlayground,
});

const shareRoute = createRoute({
  getParentRoute: () => indexRoute,
    component: ShareLoader,
  path: "s/$shareId",
  loader: ({ params: { shareId } }) => shareLoader(shareId),
    pendingComponent: LoadingView,
  errorComponent: ShareErrorComponent
})

const inlineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/i/$shareId",
  component: InlinePlayground,
  loader: ({ params: { shareId } }) => shareLoader(shareId),
    pendingComponent: LoadingView,
  errorComponent: ShareErrorComponent
});

const embeddedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e/$shareId",
  component: EmbeddedPlayground,
  loader: ({ params: { shareId } }) => shareLoader(shareId),
    pendingComponent: LoadingView,
  errorComponent: ShareErrorComponent
});

// TODO: check all this routing behavior 
const routeTree = rootRoute.addChildren([indexRoute.addChildren([shareRoute]), inlineRoute, embeddedRoute]);
const router = createRouter({ routeTree });

const config = AppConfig();

// TODO: set up a baby API that does "share" logic locally in the dev env
if (config.shareApiEndpoint) {
  console.log(`[playground] sharing: enabled (${config.shareApiEndpoint})`);
} else {
  console.log("[playground] sharing: disabled (VITE_SHARE_API_ENDPOINT is not set)");
}

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

  return (
    <>
      <Toaster />
      <TanStackRouterDevtools />
      <CookiesProvider>
        <PHProvider>
          <ThemeProvider>
            <SettingsProvider>
              <TooltipProvider delayDuration={400}>
                <RouterProvider router={router} />
              </TooltipProvider>
            </SettingsProvider>
          </ThemeProvider>
        </PHProvider>
      </CookiesProvider>
    </>
  );
}

export default App;
