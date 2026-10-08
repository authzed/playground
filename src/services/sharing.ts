import type { SharedDataV2 } from "../schemas/share-data";

import type { CheckWatch } from "./check";
import type { DatastoreDocs } from "./datastore";

/** Create a stable link to exactly the documents and watches captured by the caller. */
export async function createShareLink(
  docs: DatastoreDocs,
  watches: CheckWatch[],
  endpoint: string,
  baseUrl: string,
): Promise<string> {
  const response = await fetch(`${endpoint}/api/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "2",
      schema: docs.schema,
      relationships_yaml: docs.relationships,
      assertions_yaml: docs.assertions,
      validation_yaml: docs.expected,
      ...(watches.length > 0 ? { check_watches: watches } : {}),
    } satisfies SharedDataV2),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.error === "string" ? error.error : "Failed to share playground");
  }
  const result = await response.json();
  if (typeof result.hash !== "string" || !/^[A-Za-z0-9_-]+$/.test(result.hash)) {
    throw new Error("Invalid share response");
  }
  return new URL(`/s/${result.hash}`, baseUrl).href;
}
