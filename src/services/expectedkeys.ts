import { Resolver, parseSchema } from "@authzed/spicedb-parser-js";
import yaml from "yaml";

import { parseRelationships } from "../spicedb-common/parsing";

/**
 * enumerateExpectedKeys returns the sorted, deduplicated set of expected relations keys
 * applicable to the objects found in the given relationships, in `type:id#name` form.
 *
 * Returns undefined if the schema could not be parsed, which is not the same as an empty
 * result. This parser is versioned separately from the Go one inside the WASM module, so it
 * can fail on syntax the WASM accepts. The caller still falls back to populating only the
 * keys already in the document; distinguishing the two cases is what lets it tell the user
 * that happened, rather than reporting plain success.
 *
 * The schema is parsed here rather than read from the local parse service so the result
 * is consistent with the text at call time.
 */
export const enumerateExpectedKeys = (
  schemaText: string,
  relationshipsText: string,
): string[] | undefined => {
  const parsed = parseSchema(schemaText);
  if (parsed === undefined) {
    return undefined;
  }

  const resolver = new Resolver(parsed);
  const objects = new Map<string, string>();

  parseRelationships(relationshipsText).forEach((rel) => {
    const resource = rel.resourceAndRelation;
    if (resource !== undefined) {
      objects.set(`${resource.namespace}:${resource.objectId}`, resource.namespace);
    }

    const subject = rel.subject;
    if (subject !== undefined && subject.objectId !== "*") {
      objects.set(`${subject.namespace}:${subject.objectId}`, subject.namespace);
    }
  });

  const keys = new Set<string>();
  objects.forEach((namespace, object) => {
    const definition = resolver.lookupDefinition(namespace);

    // The resolver looks definitions up with `in` against a plain object, so names like
    // "constructor" resolve to Object.prototype members rather than to a definition.
    if (typeof definition?.listRelationsAndPermissionNames !== "function") {
      return;
    }

    definition.listRelationsAndPermissionNames().forEach((name) => keys.add(`${object}#${name}`));
  });

  return [...keys].sort();
};

/**
 * mergeExpectedKeys returns the expected relations YAML with any of the given keys that are
 * absent added with an empty value, leaving every existing key untouched.
 *
 * Returns undefined if the existing content is not a plain YAML map, which the caller should
 * treat as an abort rather than overwriting the user's document.
 */
export const mergeExpectedKeys = (existingYaml: string, keys: string[]): string | undefined => {
  let existing: unknown = undefined;
  if (existingYaml.trim()) {
    try {
      existing = yaml.parse(existingYaml);
    } catch {
      return undefined;
    }
  }

  if (existing === undefined || existing === null) {
    existing = {};
  }

  if (typeof existing !== "object" || Array.isArray(existing)) {
    return undefined;
  }

  const merged = existing as Record<string, unknown>;
  keys.forEach((key) => {
    // Defensive rather than load-bearing: every enumerated key contains ":" and "#", so none
    // can collide with an Object.prototype member. Unlike the lookup guard above, which is
    // reachable because it keys on a bare object type.
    if (!Object.prototype.hasOwnProperty.call(merged, key)) {
      merged[key] = [];
    }
  });

  return yaml.stringify(merged);
};
