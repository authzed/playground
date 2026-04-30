// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  CHECK_WATCH_STORAGE_KEY,
  loadStoredWatches,
  saveStoredWatches,
} from "./checkwatchstorage";

describe("checkwatchstorage", () => {
  afterEach(() => {
    localStorage.removeItem(CHECK_WATCH_STORAGE_KEY);
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadStoredWatches()).toEqual([]);
  });

  it("round-trips a non-empty list", () => {
    const watches = [
      { object: "document:foo", action: "view", subject: "user:alice", context: "" },
      { object: "document:bar", action: "edit", subject: "user:bob" },
    ];
    saveStoredWatches(watches);
    expect(loadStoredWatches()).toEqual(watches);
  });

  it("returns an empty array and clears the key on corrupt JSON", () => {
    localStorage.setItem(CHECK_WATCH_STORAGE_KEY, "{not-json");
    expect(loadStoredWatches()).toEqual([]);
    expect(localStorage.getItem(CHECK_WATCH_STORAGE_KEY)).toBeNull();
  });

  it("returns an empty array on shape mismatch (not an array)", () => {
    localStorage.setItem(CHECK_WATCH_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadStoredWatches()).toEqual([]);
  });

  it("filters out malformed entries", () => {
    localStorage.setItem(
      CHECK_WATCH_STORAGE_KEY,
      JSON.stringify([
        { object: "document:foo", action: "view", subject: "user:alice" },
        { object: 42, action: "view", subject: "user:bob" },
        { object: "document:baz", action: "edit", subject: "user:carol", context: "default:{}" },
      ]),
    );
    expect(loadStoredWatches()).toEqual([
      { object: "document:foo", action: "view", subject: "user:alice" },
      { object: "document:baz", action: "edit", subject: "user:carol", context: "default:{}" },
    ]);
  });
});
