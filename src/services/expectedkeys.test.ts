import { describe, it, expect } from "vitest";
import yaml from "yaml";

import { enumerateExpectedKeys, mergeExpectedKeys } from "./expectedkeys";

const SCHEMA = `definition user {}

definition group {
    relation member: user
    relation admin: user
    permission membership = member + admin
}

definition folder {
    relation owner: user
    relation viewer: user | group#membership
    permission view = viewer + owner
    permission manage = owner
}

definition document {
    relation parent: folder
    relation editor: user | group#membership
    relation viewer: user | group#membership
    permission view = viewer + editor + parent->view
    permission edit = editor + parent->manage
}`;

const CAVEATED_SCHEMA = `definition user {}

caveat active_region(region string) {
    region == "us"
}

definition document {
    relation parent: document
    relation editor: user with active_region
    permission edit = editor
}`;

describe("enumerateExpectedKeys", () => {
  it("enumerates relations and permissions for resource objects", () => {
    const keys = enumerateExpectedKeys(SCHEMA, "folder:root#owner@user:carol");
    expect(keys).toEqual([
      "folder:root#manage",
      "folder:root#owner",
      "folder:root#view",
      "folder:root#viewer",
    ]);
  });

  it("enumerates subject-side objects too", () => {
    const keys = enumerateExpectedKeys(SCHEMA, "folder:root#viewer@group:eng#membership");
    expect(keys).toContain("group:eng#member");
    expect(keys).toContain("group:eng#admin");
    expect(keys).toContain("group:eng#membership");
  });

  it("contributes nothing for definitions with no members", () => {
    const keys = enumerateExpectedKeys(SCHEMA, "folder:root#owner@user:carol");
    expect(keys).toBeDefined();
    expect(keys!.some((k) => k.startsWith("user:"))).toBe(false);
  });

  it("excludes wildcard subjects", () => {
    // group is used rather than user because group has members — a wildcard of a
    // memberless type would pass this assertion even without the exclusion.
    const keys = enumerateExpectedKeys(SCHEMA, "folder:root#viewer@group:*");
    expect(keys).toBeDefined();
    expect(keys!.some((k) => k.includes("*"))).toBe(false);
  });

  it("uses the base object for subject relations, not the qualified string", () => {
    const keys = enumerateExpectedKeys(SCHEMA, "folder:root#viewer@group:eng#membership");
    expect(keys).toBeDefined();
    expect(keys!.some((k) => k.startsWith("group:eng#membership#"))).toBe(false);
  });

  it("skips unknown definitions", () => {
    const keys = enumerateExpectedKeys(SCHEMA, "nope:thing#rel@user:carol");
    expect(keys).toBeDefined();
    expect(keys!.some((k) => k.startsWith("nope:"))).toBe(false);
  });

  it("skips object types that collide with Object.prototype members", () => {
    // The resolver looks definitions up with `in`, so "constructor" and friends resolve to
    // prototype members. Calling listRelationsAndPermissionNames on those throws.
    for (const name of ["constructor", "toString", "valueOf", "hasOwnProperty"]) {
      expect(() => enumerateExpectedKeys(SCHEMA, `${name}:thing#viewer@user:carol`)).not.toThrow();
      expect(enumerateExpectedKeys(SCHEMA, `${name}:thing#viewer@user:carol`)).toEqual([]);
    }
  });

  it("sorts and deduplicates across repeated objects", () => {
    const keys = enumerateExpectedKeys(
      SCHEMA,
      "folder:root#owner@user:carol\nfolder:root#viewer@user:erin",
    );
    expect(keys).toEqual([...new Set(keys)].sort());
  });

  it("returns undefined when the schema does not compile", () => {
    // Distinct from an empty result: this parser is versioned separately from the one in
    // the WASM module, so it can reject a schema SpiceDB accepts. Conflating the two would
    // silently skip enumeration entirely.
    expect(enumerateExpectedKeys("definition {{{", "folder:root#owner@user:carol")).toBeUndefined();
  });

  it("returns empty, not undefined, when the schema is fine but nothing applies", () => {
    expect(enumerateExpectedKeys(SCHEMA, "")).toEqual([]);
    expect(enumerateExpectedKeys(SCHEMA, "nope:thing#viewer@user:carol")).toEqual([]);
  });

  it("enumerates a self-referential relation from a single object", () => {
    // document:root is both the resource and the subject, so it must dedupe to one object.
    const keys = enumerateExpectedKeys(CAVEATED_SCHEMA, "document:root#parent@document:root");
    expect(keys).toEqual(["document:root#edit", "document:root#editor", "document:root#parent"]);
  });

  it("enumerates keys for caveated relationships", () => {
    const keys = enumerateExpectedKeys(
      CAVEATED_SCHEMA,
      'document:doc1#editor@user:alice[active_region:{"region":"us"}]',
    );
    expect(keys).toEqual(["document:doc1#edit", "document:doc1#editor", "document:doc1#parent"]);
  });
});

describe("mergeExpectedKeys", () => {
  it("adds keys to a blank document", () => {
    const merged = mergeExpectedKeys("", ["document:doc1#view", "folder:root#view"]);
    expect(yaml.parse(merged!)).toEqual({
      "document:doc1#view": [],
      "folder:root#view": [],
    });
  });

  it("adds keys to a whitespace-only document", () => {
    const merged = mergeExpectedKeys("   \n  ", ["document:doc1#view"]);
    expect(yaml.parse(merged!)).toEqual({ "document:doc1#view": [] });
  });

  it("preserves existing keys and their values", () => {
    const existing = 'document:doc1#view:\n  - "[user:alice] is <document:doc1#editor>"\n';
    const merged = mergeExpectedKeys(existing, ["document:doc1#view", "document:doc1#edit"]);
    expect(yaml.parse(merged!)).toEqual({
      "document:doc1#view": ["[user:alice] is <document:doc1#editor>"],
      "document:doc1#edit": [],
    });
  });

  it("preserves hand-added keys the enumeration does not know about", () => {
    const existing = "legacy:thing#read: []\n";
    const merged = mergeExpectedKeys(existing, ["document:doc1#view"]);
    expect(Object.keys(yaml.parse(merged!)).sort()).toEqual([
      "document:doc1#view",
      "legacy:thing#read",
    ]);
  });

  it("returns undefined when the document is a list", () => {
    expect(mergeExpectedKeys("- one\n- two\n", ["document:doc1#view"])).toBeUndefined();
  });

  it("returns undefined when the document is a scalar", () => {
    expect(mergeExpectedKeys("just a string\n", ["document:doc1#view"])).toBeUndefined();
  });

  it("returns undefined when the document is not valid YAML", () => {
    expect(mergeExpectedKeys("{invalid: [\n", ["document:doc1#view"])).toBeUndefined();
  });

  it("returns the document unchanged when there are no keys to add", () => {
    const existing = "document:doc1#view: []\n";
    const merged = mergeExpectedKeys(existing, ["document:doc1#view"]);
    expect(yaml.parse(merged!)).toEqual({ "document:doc1#view": [] });
  });

  // An empty key list is the enumeration-failed fallback path, so it needs its own coverage:
  // the caller passes `keys ?? []` and relies on the document surviving intact.
  it("leaves a valid document intact when given no keys at all", () => {
    const existing = 'document:doc1#view:\n  - "[user:alice] is <document:doc1#editor>"\n';
    const merged = mergeExpectedKeys(existing, []);
    expect(merged).toBeDefined();
    expect(yaml.parse(merged!)).toEqual({
      "document:doc1#view": ["[user:alice] is <document:doc1#editor>"],
    });
  });

  it("still rejects a non-map document when given no keys at all", () => {
    expect(mergeExpectedKeys("- one\n- two\n", [])).toBeUndefined();
  });
});
