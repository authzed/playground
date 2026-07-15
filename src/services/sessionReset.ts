// Cross-route signal for "a new document was loaded outside the main playground
// view" (e.g. the /s/<share> route, which loads into its own datastore instance
// and navigates away — so the FullPlayground reload listener never sees it).
//
// The share route sets this flag; the history recorder consumes it on its next
// hydrate and starts fresh instead of reloading the previous document's
// IndexedDB-persisted revisions.
let pendingReset = false;

export function markPendingSessionReset(): void {
  pendingReset = true;
}

export function consumePendingSessionReset(): boolean {
  const value = pendingReset;
  pendingReset = false;
  return value;
}
