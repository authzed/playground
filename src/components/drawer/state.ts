import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId = "problems" | "watches" | "terminal";

const STORAGE_KEY = "playground-drawer-state";
const STATE_VERSION = 2;
const DEFAULT_HEIGHT = 280;
const MIN_HEIGHT = 120;
/** Maximum fraction of the viewport height the drawer is allowed to consume. */
const MAX_HEIGHT_FRACTION = 0.6;

/**
 * Compute the maximum allowable drawer height based on the current viewport.
 * Falls back to a generous default when window is unavailable (SSR / tests).
 */
export function maxDrawerHeight(): number {
  if (typeof window === "undefined") return 600;
  return Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * MAX_HEIGHT_FRACTION));
}

/** Clamp a persisted/incoming height into the allowable range. */
function clampHeight(h: number): number {
  return Math.min(maxDrawerHeight(), Math.max(MIN_HEIGHT, h));
}

type DrawerState = {
  open: boolean;
  activePanel: PanelId | null;
  perPanelHeight: Record<PanelId, number>;
};

type DrawerActions = {
  openPanel: (panel: PanelId) => void;
  togglePanel: (panel: PanelId) => void;
  closeDrawer: () => void;
  setHeight: (panel: PanelId, height: number) => void;
};

const DEFAULT_STATE: DrawerState = {
  open: false,
  activePanel: null,
  perPanelHeight: {
    problems: DEFAULT_HEIGHT,
    watches: DEFAULT_HEIGHT,
    terminal: DEFAULT_HEIGHT,
  },
};

export const useDrawerStore = create<DrawerState & DrawerActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      openPanel: (panel) => set({ open: true, activePanel: panel }),

      togglePanel: (panel) => {
        const s = get();
        if (s.open && s.activePanel === panel) {
          set({ open: false });
        } else {
          set({ open: true, activePanel: panel });
        }
      },

      closeDrawer: () => set({ open: false }),

      setHeight: (panel, height) => {
        const clamped = clampHeight(height);
        set((s) => ({
          ...s,
          perPanelHeight: { ...s.perPanelHeight, [panel]: clamped },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      migrate: () => DEFAULT_STATE,
      // Clamp persisted heights on rehydrate to recover from any previously
      // saved state that exceeds the current viewport.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.perPanelHeight = {
          problems: clampHeight(state.perPanelHeight.problems),
          watches: clampHeight(state.perPanelHeight.watches),
          terminal: clampHeight(state.perPanelHeight.terminal),
        };
      },
    },
  ),
);

export { DEFAULT_HEIGHT, MIN_HEIGHT };
