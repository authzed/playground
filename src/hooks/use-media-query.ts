import { useState, useLayoutEffect } from "react";

type UseMediaQueryOptions = {
  defaultValue?: boolean;
  initializeWithValue?: boolean;
};

const getMatches = (query: string): boolean => {
  return window.matchMedia(query).matches;
};

export function useMediaQuery(
  query: string,
  { defaultValue = false, initializeWithValue = true }: UseMediaQueryOptions = {},
): boolean {
  const [matches, setMatches] = useState(() => {
    if (initializeWithValue) {
      return getMatches(query);
    }
    return defaultValue;
  });

  useLayoutEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Handles the change event of the media query.
    // Declared inside the layout effect so that we don't need
    // to worry about its identity.
    const handleChange = () => setMatches(getMatches(query));

    // Triggered at the first client-side load and if query changes
    handleChange();

    matchMedia.addEventListener("change", handleChange);

    return () => {
      matchMedia.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
