import { AlertProvider } from './playground-ui/AlertProvider';
import { ConfirmDialogProvider } from './playground-ui/ConfirmDialogProvider';
import { useGoogleAnalytics } from './playground-ui/GoogleAnalyticsHook';
import PlaygroundUIThemed from './playground-ui/PlaygroundUIThemed';
import React from 'react';
import 'react-reflex/styles.css';
import { BrowserRouter } from 'react-router-dom';
import 'typeface-roboto-mono'; // Import the Roboto Mono font.
import './App.css';
import { EmbeddedPlayground } from './components/EmbeddedPlayground';
import { FullPlayground } from './components/FullPlayground';
import { InlinePlayground } from './components/InlinePlayground';
import AppConfig from './services/configservice';
import { PLAYGROUND_UI_COLORS } from './theme';

var _ = React;

export interface AppProps {
  /**
   * withRouter, it specified, is the router to wrap the application with.
   */
  withRouter?: any;

  /**
   * forTesting indicates whether the app is for testing.
   */
  forTesting?: boolean | undefined;
}

function ForTesting() {
  return <FullPlayground />;
}

function ThemedApp(props: {
  withRouter?: any;
  forTesting: boolean | undefined;
}) {
  if (window.location.pathname.indexOf('/i/') >= 0) {
    return (
      <BrowserRouter>
        <InlinePlayground />
      </BrowserRouter>
    );
  }

  if (window.location.pathname.indexOf('/e/') >= 0) {
    return (
      <BrowserRouter>
        <EmbeddedPlayground />
      </BrowserRouter>
    );
  }

  if (props.forTesting) {
    return (
        <ForTesting />
    );
  } else {
    return <FullPlayground withRouter={props.withRouter} />;
  }
}

function App(props: AppProps) {
  // Register GA hook.
  useGoogleAnalytics(AppConfig().ga.measurementId);

  const isEmbeddedPlayground = window.location.pathname.indexOf('/e/') >= 0;
  return (
    <PlaygroundUIThemed
      {...PLAYGROUND_UI_COLORS}
      forceDarkMode={isEmbeddedPlayground}
    >
      <AlertProvider>
        <ConfirmDialogProvider>
          <ThemedApp
            withRouter={props.withRouter}
            forTesting={props.forTesting}
          />
        </ConfirmDialogProvider>
      </AlertProvider>
    </PlaygroundUIThemed>
  );
}

export default App;
