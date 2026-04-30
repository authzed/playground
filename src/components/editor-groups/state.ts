import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ALL_DOCUMENT_REFS,
  DocumentRef,
  EditorGroup,
  EditorState,
  DEFAULT_EDITOR_STATE,
} from "./types";

const STORAGE_KEY = "playground-editor-state";
const STATE_VERSION = 1;

type EditorActions = {
  /** Switch the active tab in a group. */
  setActiveTab: (groupId: string, tab: DocumentRef) => void;
  /** Move a tab to a (possibly new) group, splitting if needed. */
  splitTab: (tab: DocumentRef, direction: "horizontal" | "vertical") => void;
  /** Move a tab from one group to another (or reorder within). */
  moveTab: (tab: DocumentRef, targetGroupId: string, beforeTab?: DocumentRef) => void;
  /** Close a tab — moves the document to the closed pool. */
  closeTab: (tab: DocumentRef) => void;
  /** Open a closed-pool document into a group. */
  openInGroup: (tab: DocumentRef, groupId: string) => void;
  /** Close an entire group — merges its tabs into the surviving group. */
  closeGroup: (groupId: string) => void;
  /** Reset to default. */
  reset: () => void;
};

type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => {
      // Wrap every mutation in `reconcileTabs` so an action that accidentally
      // drops a tab on the floor (no group + not in closedPool) is auto-recovered.
      // Without this, a stale-closure double-drop or any future action bug
      // could leave a tab unreachable from the UI.
      const setReconciled: typeof set = (updater) =>
        set((s) =>
          typeof updater === "function"
            ? reconcileTabs((updater as (s: EditorStore) => EditorStore)(s))
            : reconcileTabs(updater as EditorStore),
        );
      return {
        ...DEFAULT_EDITOR_STATE,

        setActiveTab: (groupId, tab) =>
          setReconciled((s) => updateGroup(s, groupId, (g) => ({ ...g, activeTab: tab }))),

        splitTab: (tab, direction) =>
          setReconciled((s) => {
            if (s.layout.kind === "split") return s;
            const sourceGroup = s.layout.group;
            if (!sourceGroup.tabs.includes(tab)) return s;
            if (sourceGroup.tabs.length === 1) return s;

            const remainingTabs = sourceGroup.tabs.filter((t) => t !== tab);
            const newPrimary: EditorGroup = {
              ...sourceGroup,
              tabs: remainingTabs,
              activeTab:
                sourceGroup.activeTab === tab ? remainingTabs[0] : sourceGroup.activeTab,
            };
            const newSecondary: EditorGroup = {
              id: "g2",
              tabs: [tab],
              activeTab: tab,
            };
            return {
              ...s,
              layout: {
                kind: "split",
                direction,
                primary: newPrimary,
                secondary: newSecondary,
              },
            };
          }),

        moveTab: (tab, targetGroupId, beforeTab) =>
          setReconciled((s) => {
            const removed = removeTabFromAllGroups(s, tab);
            const inserted = insertTabIntoGroup(removed, targetGroupId, tab, beforeTab);
            return collapseEmptyGroup(inserted);
          }),

        closeTab: (tab) =>
          setReconciled((s) => {
            if (s.layout.kind === "single" && s.layout.group.tabs.length === 1) return s;

            const next = collapseEmptyGroup(removeTabFromAllGroups(s, tab));

            if (!next.closedPool.includes(tab)) {
              return { ...next, closedPool: [...next.closedPool, tab] };
            }
            return next;
          }),

        openInGroup: (tab, groupId) =>
          setReconciled((s) => {
            if (!s.closedPool.includes(tab)) return s;
            const next: EditorState = {
              ...s,
              closedPool: s.closedPool.filter((t) => t !== tab),
            };
            return updateGroup(next, groupId, (g) => ({
              ...g,
              tabs: [...g.tabs, tab],
              activeTab: tab,
            }));
          }),

        closeGroup: (groupId) =>
          setReconciled((s) => {
            if (s.layout.kind !== "split") return s;
            const surviving =
              s.layout.primary.id === groupId ? s.layout.secondary : s.layout.primary;
            const closing =
              s.layout.primary.id === groupId ? s.layout.primary : s.layout.secondary;
            const newTabs = [
              ...surviving.tabs,
              ...closing.tabs.filter((t) => !surviving.tabs.includes(t)),
            ];
            return {
              ...s,
              layout: {
                kind: "single",
                group: { ...surviving, id: "g1", tabs: newTabs },
              },
            };
          }),

        reset: () => set(DEFAULT_EDITOR_STATE),
      };
    },
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      migrate: () => DEFAULT_EDITOR_STATE,
    },
  ),
);

function updateGroup(
  state: EditorState,
  groupId: string,
  updater: (g: EditorGroup) => EditorGroup,
): EditorState {
  if (state.layout.kind === "single") {
    if (state.layout.group.id !== groupId) return state;
    return { ...state, layout: { ...state.layout, group: updater(state.layout.group) } };
  }
  if (state.layout.primary.id === groupId) {
    return {
      ...state,
      layout: { ...state.layout, primary: updater(state.layout.primary) },
    };
  }
  if (state.layout.secondary.id === groupId) {
    return {
      ...state,
      layout: { ...state.layout, secondary: updater(state.layout.secondary) },
    };
  }
  return state;
}

/**
 * Validate that every known DocumentRef is reachable: present in some group's
 * tabs OR in the closedPool. Any tab missing from both is "orphaned" — it has
 * no UI affordance to bring it back. Recover by appending orphans to closedPool
 * so the user can reopen them from the open-document menu.
 *
 * Why: actions that mutate tabs piecewise (moveTab, etc.) can leave tabs in a
 * half-state if they're called with stale args (e.g. a stale-closure duplicate
 * drop targeting a now-collapsed group id). Reconciling after every mutation
 * makes the orphan state unrepresentable in persisted state.
 */
function reconcileTabs(state: EditorState): EditorState {
  const present = new Set<DocumentRef>(state.closedPool);
  if (state.layout.kind === "single") {
    state.layout.group.tabs.forEach((t) => present.add(t));
  } else {
    state.layout.primary.tabs.forEach((t) => present.add(t));
    state.layout.secondary.tabs.forEach((t) => present.add(t));
  }
  const orphans = ALL_DOCUMENT_REFS.filter((d) => !present.has(d));
  if (orphans.length === 0) return state;
  return { ...state, closedPool: [...state.closedPool, ...orphans] };
}

/**
 * Collapse a split layout to single when either group has no tabs, so we never
 * leave an empty tab strip behind after a move or close.
 */
function collapseEmptyGroup(state: EditorState): EditorState {
  if (state.layout.kind !== "split") return state;
  if (state.layout.primary.tabs.length === 0) {
    return {
      ...state,
      layout: { kind: "single", group: { ...state.layout.secondary, id: "g1" } },
    };
  }
  if (state.layout.secondary.tabs.length === 0) {
    return {
      ...state,
      layout: { kind: "single", group: { ...state.layout.primary, id: "g1" } },
    };
  }
  return state;
}

function removeTabFromAllGroups(state: EditorState, tab: DocumentRef): EditorState {
  const removeFromGroup = (g: EditorGroup): EditorGroup => {
    if (!g.tabs.includes(tab)) return g;
    const newTabs = g.tabs.filter((t) => t !== tab);
    const newActive = g.activeTab === tab ? (newTabs[0] ?? g.activeTab) : g.activeTab;
    return { ...g, tabs: newTabs, activeTab: newActive };
  };

  if (state.layout.kind === "single") {
    return { ...state, layout: { ...state.layout, group: removeFromGroup(state.layout.group) } };
  }
  return {
    ...state,
    layout: {
      ...state.layout,
      primary: removeFromGroup(state.layout.primary),
      secondary: removeFromGroup(state.layout.secondary),
    },
  };
}

function insertTabIntoGroup(
  state: EditorState,
  targetGroupId: string,
  tab: DocumentRef,
  beforeTab?: DocumentRef,
): EditorState {
  return updateGroup(state, targetGroupId, (g) => {
    const without = g.tabs.filter((t) => t !== tab);
    if (beforeTab && without.includes(beforeTab)) {
      const idx = without.indexOf(beforeTab);
      const newTabs = [...without.slice(0, idx), tab, ...without.slice(idx)];
      return { ...g, tabs: newTabs, activeTab: tab };
    }
    return { ...g, tabs: [...without, tab], activeTab: tab };
  });
}
