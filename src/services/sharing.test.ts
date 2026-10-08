import { afterEach, describe, expect, it, vi } from "vitest";

import { createShareLink } from "./sharing";

afterEach(() => vi.unstubAllGlobals());

describe("createShareLink", () => {
  it("shares a snapshot including watches and returns a link on the playground origin", async () => {
    let posted: unknown;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted = JSON.parse(init.body as string);
      return Response.json({ hash: "abc_123" });
    });
    const url = await createShareLink(
      {
        schema: "definition user {}",
        relationships: "doc:a#viewer@user:b",
        assertions: "assertTrue: []",
        expected: "doc:a#view: []",
      },
      [{ object: "doc:a", action: "view", subject: "user:b", context: "{}" }],
      "https://api.example.com",
      "https://play.example.com/s/old",
    );
    expect(url).toBe("https://play.example.com/s/abc_123");
    expect(posted).toEqual({
      version: "2",
      schema: "definition user {}",
      relationships_yaml: "doc:a#viewer@user:b",
      assertions_yaml: "assertTrue: []",
      validation_yaml: "doc:a#view: []",
      check_watches: [{ object: "doc:a", action: "view", subject: "user:b", context: "{}" }],
    });
  });

  it.each([
    Response.json({ error: "Storage unavailable" }, { status: 503 }),
    Response.json({ hash: "../wrong" }),
    Response.json({}),
  ])("rejects failed or malformed responses", async (response) => {
    vi.stubGlobal("fetch", async () => response);
    await expect(
      createShareLink(
        { schema: "", relationships: "", assertions: "", expected: "" },
        [],
        "",
        "https://play.example.com",
      ),
    ).rejects.toThrow();
  });
});
