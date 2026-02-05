import CssBaseline from "@material-ui/core/CssBaseline";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { ReactNode, useMemo, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

export interface PlaygroundUIThemedProps {
  lightColor?: string;
  darkColor?: string;
  forceDarkMode?: boolean;
  children: ReactNode;
}

/**
 * Applied PlaygroundUI themeing to any child content.
 * @example <PlaygroundUIThemed>content</PlaygroundUIThemed>
 */
export default function PlaygroundUIThemed({
  lightColor,
  darkColor,
  forceDarkMode,
  children,
}: PlaygroundUIThemedProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  // Determine whether the user prefers dark or light mode.
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const darkMode =
    forceDarkMode === true ||
    (currentTheme === "system" ? prefersDarkMode : currentTheme === "dark");

  useEffect(() => {
    if (forceDarkMode) {
      setTheme("dark");
    }
  }, [forceDarkMode, setTheme]);

  const dark = useMemo(() => {
    return {
      500: darkColor || "#5730b2",
    };
  }, [darkColor]);

  const light = useMemo(() => {
    return {
      500: lightColor || "#6739b0",
    };
  }, [lightColor]);

  // Instantiate the theme based on the user selection.
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          type: darkMode ? "dark" : "light",
          primary: darkMode ? dark : light,
          action: {
            hover: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.1)",
            selected: darkMode ? undefined : "rgba(0, 0, 0, 0.1)",
          },
        },
        overrides: {
          MuiMenu: {
            paper: {
              boxShadow: "0px 0px 10px #00000075",
            },
          },
          MuiInputLabel: {
            root: {
              "&$focused": {
                color: darkMode ? "white" : "inherit",
              },
            },
          },
          MuiTab: {
            wrapper: {
              flexDirection: "row",
            },
          },
          MuiInputBase: {
            root: {
              "& input": {
                "&:-webkit-autofill": {
                  transition: "background-color 50000s ease-in-out 0s, color 50000s ease-in-out 0s",
                },
                "&:-webkit-autofill:focus": {
                  transition: "background-color 50000s ease-in-out 0s, color 50000s ease-in-out 0s",
                },
                "&:-webkit-autofill:hover": {
                  transition: "background-color 50000s ease-in-out 0s, color 50000s ease-in-out 0s",
                },
              },
            },
          },
        },
      }),
    [darkMode, light, dark],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
