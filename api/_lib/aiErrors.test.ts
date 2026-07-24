import { describe, expect, it } from "vitest";

import { preStreamError } from "./aiErrors.js";

describe("preStreamError", () => {
  it("maps each kind to its status and a code matching the kind", () => {
    expect(preStreamError("method_not_allowed").status).toBe(405);
    expect(preStreamError("disabled").status).toBe(503);
    expect(preStreamError("server_config").status).toBe(500);
    expect(preStreamError("bad_request").status).toBe(400);
    expect(preStreamError("rate_limit").status).toBe(429);
    expect(preStreamError("disabled").body.code).toBe("disabled");
  });

  it("returns copy that explains the problem and what to try", () => {
    expect(preStreamError("disabled").body.error).toMatch(/turned off/i);
    expect(preStreamError("bad_request").body.error).toMatch(/new chat/i);
    expect(preStreamError("rate_limit").body.error).toMatch(/wait a moment/i);
    expect(preStreamError("server_config").body.error).toMatch(/try again later/i);
  });

  it("never leaks internal configuration detail in the server_config copy", () => {
    expect(preStreamError("server_config").body.error).not.toMatch(/api[_ ]?key|OPENROUTER/i);
  });

  it("carries retryAfter structurally rather than in the copy", () => {
    const rl = preStreamError("rate_limit", 30);
    expect(rl.body.retryAfter).toBe(30);
    expect(rl.body.error).not.toMatch(/30/);
  });

  it("omits retryAfter entirely when none is given", () => {
    expect("retryAfter" in preStreamError("rate_limit").body).toBe(false);
  });
});
