import { useEffect, useState } from "react";

import { useTheme } from "@/components/ThemeProvider";

/**
 * useResolvedTheme returns the actual rendered theme ('light' | 'dark'),
 * resolving 'system' to the current `prefers-color-scheme` setting.
 */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}
