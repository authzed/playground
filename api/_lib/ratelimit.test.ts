import { describe, expect, it } from "vitest";

import { createLimiter, resolvePerMinute } from "./ratelimit";

describe("createLimiter", () => {
  it("allows all requests when Upstash env is absent (dev)", async () => {
    const limiter = createLimiter({} as NodeJS.ProcessEnv);
    expect(await limiter.limit("1.2.3.4")).toEqual({ ok: true });
  });
});

describe("resolvePerMinute", () => {
  it("falls back to 15 for absent, empty, non-numeric, zero, or negative values", () => {
    expect(resolvePerMinute({} as NodeJS.ProcessEnv)).toBe(15);
    expect(resolvePerMinute({ AI_RATELIMIT_PER_MINUTE: "" } as unknown as NodeJS.ProcessEnv)).toBe(15);
    expect(resolvePerMinute({ AI_RATELIMIT_PER_MINUTE: "abc" } as unknown as NodeJS.ProcessEnv)).toBe(15);
    expect(resolvePerMinute({ AI_RATELIMIT_PER_MINUTE: "0" } as unknown as NodeJS.ProcessEnv)).toBe(15);
    expect(resolvePerMinute({ AI_RATELIMIT_PER_MINUTE: "-5" } as unknown as NodeJS.ProcessEnv)).toBe(15);
  });
  it("uses a valid positive value", () => {
    expect(resolvePerMinute({ AI_RATELIMIT_PER_MINUTE: "30" } as unknown as NodeJS.ProcessEnv)).toBe(30);
  });
});
