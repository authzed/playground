import { describe, expect, it } from "vitest";

import AppConfig from "./configservice";

describe("AppConfig", () => {
  it("exposes aiApiEndpoint and aiEnabled", () => {
    const config = AppConfig();
    expect("aiApiEndpoint" in config).toBe(true);
    expect(typeof config.aiEnabled).toBe("boolean");
  });
});
