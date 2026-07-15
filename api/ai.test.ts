import { describe, expect, it } from "vitest";

import { describeTurnError } from "./ai";

describe("describeTurnError", () => {
  it("maps a 429 with a Headers retry-after to a rate_limit error with timing", () => {
    const err = Object.assign(new Error("Too Many Requests"), {
      status: 429,
      headers: new Headers({ "retry-after": "42" }),
    });
    const out = describeTurnError(err);
    expect(out.code).toBe("rate_limit");
    expect(out.message).toMatch(/rate limited/i);
    expect(out.retryAfter).toBe(42);
  });

  it("reads retry-after from a plain-record headers object", () => {
    const err = { status: 429, headers: { "retry-after": "10" }, message: "rl" };
    const out = describeTurnError(err);
    expect(out.code).toBe("rate_limit");
    expect(out.retryAfter).toBe(10);
  });

  it("omits retryAfter when the header is missing or non-numeric", () => {
    expect(describeTurnError({ status: 429, headers: {} }).retryAfter).toBeUndefined();
    expect(
      describeTurnError({ status: 429, headers: { "retry-after": "soon" } }).retryAfter,
    ).toBeUndefined();
  });

  it("maps 503 and 529 to an overloaded error", () => {
    expect(describeTurnError({ status: 503 }).code).toBe("overloaded");
    expect(describeTurnError({ status: 529 }).code).toBe("overloaded");
  });

  it("falls back to a server_error with the message for other failures", () => {
    expect(describeTurnError(new Error("boom"))).toEqual({
      code: "server_error",
      message: "boom",
    });
  });
});
