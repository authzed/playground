import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DockPanelId = "assistant" | "history";

const STORAGE_KEY = "playground-rightdock-state";
const STATE_VERSION = 1;
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 240;
const MAX_WIDTH_FRACTION = 0.6;

export function maxDockWidth(): number {
  if (typeof window === "undefined") return 800;
  return Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_WIDTH_FRACTION));
}

function clampWidth(w: number): number {
  return Math.min(maxDockWidth(), Math.max(MIN_WIDTH, w));
}

type State = {
  open: boolean;
  activePanel: DockPanelId | null;
  perPanelWidth: Record<DockPanelId, number>;
};
type Actions = {
  openPanel: (p: DockPanelId) => void;
  togglePanel: (p: DockPanelId) => void;
  closeDock: () => void;
  setWidth: (p: DockPanelId, w: number) => void;
};

// Open to the assistant by default so first-time visitors see it right away.
// Returning visitors get their persisted open/closed state instead (see
// `persist` below), which overrides this default once rehydrated.
const DEFAULT_STATE: State = {
  open: true,
  activePanel: "assistant",
  perPanelWidth: { assistant: DEFAULT_WIDTH, history: DEFAULT_WIDTH },
};

export const useRightDockStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      openPanel: (p) => set({ open: true, activePanel: p }),
      togglePanel: (p) => {
        const s = get();
        if (s.open && s.activePanel === p) set({ open: false });
        else set({ open: true, activePanel: p });
      },
      closeDock: () => set({ open: false }),
      setWidth: (p, w) =>
        set((s) => ({ perPanelWidth: { ...s.perPanelWidth, [p]: clampWidth(w) } })),
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      migrate: () => DEFAULT_STATE,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.perPanelWidth = {
          assistant: clampWidth(state.perPanelWidth.assistant),
          history: clampWidth(state.perPanelWidth.history),
        };
      },
    },
  ),
);

export { DEFAULT_STATE, DEFAULT_WIDTH, MIN_WIDTH };
