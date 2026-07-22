import { afterEach, describe, expect, it, vi } from "vitest";

import AppConfig from "./configservice";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AppConfig", () => {
  it("exposes aiApiEndpoint and aiEnabled", () => {
    const config = AppConfig();
    expect("aiApiEndpoint" in config).toBe(true);
    expect(typeof config.aiEnabled).toBe("boolean");
  });

  it("enables the AI assistant only when VITE_AI_ENABLED is exactly 'true'", () => {
    vi.stubEnv("VITE_AI_ENABLED", "true");
    expect(AppConfig().aiEnabled).toBe(true);
  });

  it("keeps the AI assistant hidden when the flag is unset, empty, 'false', or anything else", () => {
    for (const value of ["", "false", "1", "yes"]) {
      vi.stubEnv("VITE_AI_ENABLED", value);
      expect(AppConfig().aiEnabled, `value=${JSON.stringify(value)}`).toBe(false);
    }
    vi.stubEnv("VITE_AI_ENABLED", undefined);
    expect(AppConfig().aiEnabled).toBe(false);
  });
});
