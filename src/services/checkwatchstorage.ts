import type { CheckWatch } from "../spicedb-common/validationfileformat";

export const CHECK_WATCH_STORAGE_KEY = "playgroundwatches-0.1";

function isValidWatch(value: unknown): value is CheckWatch {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.object !== "string") return false;
  if (typeof v.action !== "string") return false;
  if (typeof v.subject !== "string") return false;
  if (v.context !== undefined && typeof v.context !== "string") return false;
  return true;
}

/**
 * loadStoredWatches reads the persisted watches from localStorage.
 * Returns an empty array on missing, invalid JSON, or shape mismatch.
 * Clears the key on parse failure so subsequent reads are clean.
 */
export function loadStoredWatches(): CheckWatch[] {
  const raw = localStorage.getItem(CHECK_WATCH_STORAGE_KEY);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(CHECK_WATCH_STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidWatch);
}

/**
 * saveStoredWatches writes the given watches to localStorage.
 */
export function saveStoredWatches(watches: CheckWatch[]): void {
  localStorage.setItem(CHECK_WATCH_STORAGE_KEY, JSON.stringify(watches));
}
