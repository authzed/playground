import { ThemeProvider as MuiThemeProvider, createTheme } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { type ReactNode } from "react";

const embeddedTheme = createTheme({
  palette: {
    type: "dark",
    primary: { main: "#A33150" },
    background: { default: "rgb(14,13,17)" },
  },
});

export function EmbeddedThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={embeddedTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
