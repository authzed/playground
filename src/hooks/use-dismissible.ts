import { useCallback, useEffect, useState } from "react";

const DEFAULT_STORAGE_KEY = "announcement-bar:dismissed";

function readDismissed(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(storageKey: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Ignore private-mode / quota errors.
  }
}

export type UseDismissibleResult = {
  dismissed: boolean;
  dismiss: () => void;
  reset: () => void;
};

/**
 * Remembers, in localStorage, whether the thing identified by `id` has been
 * dismissed. Generic: AnnouncementBar passes its `contentId` as `id`.
 */
export function useDismissible(
  id: string,
  storageKey: string = DEFAULT_STORAGE_KEY,
): UseDismissibleResult {
  const [ids, setIds] = useState<string[]>(() => readDismissed(storageKey));

  // Sync dismissal across other tabs (the `storage` event fires only in
  // documents other than the one that wrote the value, not same-tab).
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey) {
        setIds(readDismissed(storageKey));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeDismissed(storageKey, next);
      return next;
    });
  }, [id, storageKey]);

  const reset = useCallback(() => {
    setIds((prev) => {
      if (!prev.includes(id)) return prev;
      const next = prev.filter((v) => v !== id);
      writeDismissed(storageKey, next);
      return next;
    });
  }, [id, storageKey]);

  return { dismissed: ids.includes(id), dismiss, reset };
}
