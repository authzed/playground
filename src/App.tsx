import { AlertProvider } from "./playground-ui/AlertProvider";
import { ConfirmDialogProvider } from "./playground-ui/ConfirmDialogProvider";
import { useGoogleAnalytics } from "./playground-ui/GoogleAnalyticsHook";
import PlaygroundUIThemed from "./playground-ui/PlaygroundUIThemed";
import "react-reflex/styles.css";
import "typeface-roboto-mono/index.css"; // Import the Roboto Mono font.
import "./App.css";
import { EmbeddedPlayground } from "./components/EmbeddedPlayground";
import { FullPlayground } from "./components/FullPlayground";
import { InlinePlayground } from "./components/InlinePlayground";
import AppConfig from "./services/configservice";
import { PLAYGROUND_UI_COLORS } from "./theme";
import { ThemeProvider } from "@/components/ThemeProvider";
import {
  Outlet,
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools position={"bottom-right"} />
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  inlineRoute,
  embeddedRoute,
]);
const router = createRouter({ routeTree });
function App() {
  // Register GA hook.
  useGoogleAnalytics(AppConfig().ga.measurementId);

  const isEmbeddedPlayground = window.location.pathname.indexOf("/e/") >= 0;
  return (
    <ThemeProvider>
      <PlaygroundUIThemed
        {...PLAYGROUND_UI_COLORS}
        forceDarkMode={isEmbeddedPlayground}
      >
        <AlertProvider>
          <ConfirmDialogProvider>
            <RouterProvider router={router} />
          </ConfirmDialogProvider>
        </AlertProvider>
      </PlaygroundUIThemed>
    </ThemeProvider>
  );
}

export default App;
