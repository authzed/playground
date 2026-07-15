import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import { useEffect, useState, useMemo, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import { DebugInformation } from "../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import {
  DeveloperError,
  DeveloperResponse,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import {
  DeveloperService,
  DeveloperServiceError,
} from "../spicedb-common/services/developerservice";
import { CheckWatch } from "../spicedb-common/validationfileformat";

import { loadStoredWatches, saveStoredWatches } from "./checkwatchstorage";
import { DataStore, DataStoreItemKind } from "./datastore";
import { runChecksAgainst, type CheckTuple } from "./wasmRunners";

export type { CheckWatch } from "../spicedb-common/validationfileformat";

export enum LiveCheckStatus {
  PARSE_ERROR = -2,
  SERVICE_ERROR = -1,
  NOT_CHECKING = 0,
  CHECKING = 1,
  NEVER_RUN = 2,
}

export enum LiveCheckItemStatus {
  NOT_VALID = -1,
  NOT_CHECKED = 0,
  NOT_FOUND = 1,
  FOUND = 2,
  INVALID = 3,
  CAVEATED = 4,
}

export interface LiveCheckItem {
  id: string;
  object: string;
  action: string;
  subject: string;
  context: string;
  status: LiveCheckItemStatus;
  errorMessage: string | undefined;
  debugInformation?: DebugInformation;
}

export interface LiveCheckRunState {
  status: LiveCheckStatus;
  lastRun?: Date;
  requestErrors?: DeveloperError[];
  serverErr?: DeveloperServiceError;
  warnings?: DeveloperWarning[];
}

export interface LiveCheckService {
  state: LiveCheckRunState;

  items: LiveCheckItem[];

  /**
   * recentlyAddedItemId is the id of the most recently added watch via
   * addWatch. The UI uses it to drive a one-shot highlight animation; it
   * auto-clears shortly after being set.
   */
  recentlyAddedItemId: string | null;

  addItem: () => void;
  /**
   * addWatch appends a CheckWatch as a new item and returns its id. The new
   * id is also exposed via recentlyAddedItemId so consumers can flash a
   * highlight on the row.
   */
  addWatch: (watch: CheckWatch) => string;
  itemUpdated: (item: LiveCheckItem) => void;
  removeItem: (item: LiveCheckItem) => void;
  loadWatches: (watches: CheckWatch[]) => void;
  clear: () => void;
}

/**
 * liveCheckItemToWatch maps the runtime LiveCheckItem (which carries id/status/etc.)
 * to the persistable CheckWatch shape used at every persistence boundary.
 */
export function liveCheckItemToWatch(item: LiveCheckItem): CheckWatch {
  return {
    object: item.object,
    action: item.action,
    subject: item.subject,
    context: item.context,
  };
}

/**
 * assertionStringToCheckWatch parses a relationship-style assertion string
 * (`object#action@subject[caveat:context]`) into a CheckWatch. Returns
 * undefined if the string does not split into the expected pieces.
 *
 * The split is structural (not semantic): we don't validate identifiers here,
 * we just match the shape the assertions YAML actually uses. The Live Check
 * service will surface any deeper invalidity once the watch is run.
 */
export function assertionStringToCheckWatch(value: string): CheckWatch | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const hashIndex = trimmed.indexOf("#");
  const atIndex = trimmed.indexOf("@", hashIndex + 1);
  if (hashIndex < 0 || atIndex < 0) return undefined;

  const object = trimmed.slice(0, hashIndex).trim();
  const action = trimmed.slice(hashIndex + 1, atIndex).trim();
  let subjectAndCaveat = trimmed.slice(atIndex + 1).trim();
  if (!object || !action || !subjectAndCaveat) return undefined;

  let context = "";
  const caveatStart = subjectAndCaveat.indexOf("[");
  if (caveatStart >= 0 && subjectAndCaveat.endsWith("]")) {
    context = subjectAndCaveat.slice(caveatStart + 1, -1).trim();
    subjectAndCaveat = subjectAndCaveat.slice(0, caveatStart).trim();
  }

  // The Live Check UI represents an unqualified subject without the trailing
  // `#...`. Strip it here so the watch round-trips cleanly.
  const subject = subjectAndCaveat.endsWith("#...")
    ? subjectAndCaveat.slice(0, -"#...".length)
    : subjectAndCaveat;
  if (!subject) return undefined;

  return { object, action, subject, context };
}

function runEditCheckWasm(
  developerService: DeveloperService,
  datastore: DataStore,
  items: LiveCheckItem[],
): [DeveloperResponse, DeveloperWarning[]] | undefined {
  const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "";
  const relationshipsString = datastore.getSingletonByKind(
    DataStoreItemKind.RELATIONSHIPS,
  ).editableContents;

  const tuples: CheckTuple[] = items.map((item) => ({
    object: item.object,
    action: item.action,
    subject: item.subject,
    context: item.context,
  }));

  const result = runChecksAgainst(developerService, schema, relationshipsString, tuples);
  if (result === undefined) return;

  result.outcomes.forEach((outcome, i) => {
    const item = items[i];
    switch (outcome.kind) {
      case "unparseable":
        item.status = LiveCheckItemStatus.NOT_VALID;
        item.debugInformation = undefined;
        break;
      case "error":
        item.status = LiveCheckItemStatus.INVALID;
        item.errorMessage = outcome.message;
        item.debugInformation = undefined;
        break;
      case "caveated":
        item.status = LiveCheckItemStatus.CAVEATED;
        item.debugInformation = outcome.debugInformation;
        item.errorMessage = undefined;
        break;
      case "member":
        item.status = LiveCheckItemStatus.FOUND;
        item.debugInformation = outcome.debugInformation;
        item.errorMessage = undefined;
        break;
      case "not_member":
        item.status = LiveCheckItemStatus.NOT_FOUND;
        item.debugInformation = outcome.debugInformation;
        item.errorMessage = undefined;
        break;
    }
  });

  return [result.response, result.warnings];
}

/**
 * useLiveCheckService is a hook which manages the definitions of live checking,
 * including live parsing and check watches.
 */
export function useLiveCheckService(
  developerService: DeveloperService,
  datastore: DataStore,
  options?: { persist?: boolean },
): LiveCheckService {
  const persist = options?.persist === true;

  const [items, setItems] = useState<LiveCheckItem[]>(() => {
    if (!persist) return [];
    return loadStoredWatches().map((w) => ({
      id: uuidv4(),
      object: w.object,
      action: w.action,
      subject: w.subject,
      context: w.context ?? "",
      status: LiveCheckItemStatus.NOT_CHECKED,
      errorMessage: undefined,
    }));
  });
  const [state, setState] = useState<LiveCheckRunState>({
    status: LiveCheckStatus.NEVER_RUN,
  });
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(null);

  const devServiceStatus = developerService.state.status;
  const runCheck = useCallback(
    (itemsToCheck: LiveCheckItem[]) => {
      if (devServiceStatus !== "ready") {
        return;
      }

      setState({ status: LiveCheckStatus.CHECKING });
      const r = runEditCheckWasm(developerService, datastore, itemsToCheck);
      if (r === undefined) {
        setState({ status: LiveCheckStatus.NOT_CHECKING });

        if (itemsToCheck.length > 0) {
          setState({
            status: LiveCheckStatus.SERVICE_ERROR,
            lastRun: new Date(),
            requestErrors: [],
            serverErr:
              "Cannot instantiate developer service. Please make sure you have WebAssembly enabled.",
          });
        }
        return;
      }

      const [response, warnings] = r;
      const serverErr: string | undefined = response.internalError || undefined;
      const devErrs: DeveloperError[] = response.developerErrors
        ? response.developerErrors.inputErrors
        : [];
      const status = serverErr
        ? LiveCheckStatus.SERVICE_ERROR
        : devErrs.length > 0
          ? LiveCheckStatus.PARSE_ERROR
          : LiveCheckStatus.NOT_CHECKING;

      setState({
        status: status,
        lastRun: new Date(),
        requestErrors: devErrs,
        serverErr: serverErr,
        warnings: warnings,
      });
    },
    [datastore, devServiceStatus, developerService],
  );

  const check = useDebouncedCallback(runCheck, { wait: 500 });

  // Setup an effect which registers the listener for the datastore changes and processes items.
  useEffect(() => {
    return datastore.registerListener(() => {
      check(items);
    });
  }, [datastore, items, check]);

  // Setup an effect which runs the check initially once the developer service is ready.
  useEffect(() => {
    if (state.status === LiveCheckStatus.NEVER_RUN && devServiceStatus === "ready") {
      check(items);
    }
  }, [state, items, check, devServiceStatus]);

  // Persist items to localStorage whenever they change.
  useEffect(() => {
    if (!persist) return;
    saveStoredWatches(items.map(liveCheckItemToWatch));
  }, [items, persist]);

  const addItem = useCallback(() => {
    setItems((oldItems) => {
      return [
        ...oldItems,
        {
          id: uuidv4(),
          object: "",
          action: "",
          subject: "",
          context: "",
          status: LiveCheckItemStatus.NOT_CHECKED,
          errorMessage: undefined,
        },
      ];
    });
  }, []);

  const addWatch = useCallback(
    (watch: CheckWatch): string => {
      const id = uuidv4();
      const newItem: LiveCheckItem = {
        id,
        object: watch.object,
        action: watch.action,
        subject: watch.subject,
        context: watch.context ?? "",
        status: LiveCheckItemStatus.NOT_CHECKED,
        errorMessage: undefined,
      };
      setItems((oldItems) => {
        const next = [...oldItems, newItem];
        // The datastore-listener effect only fires the check on datastore
        // changes; an explicit kick is required so the new watch resolves
        // without waiting for the next edit.
        check(next);
        return next;
      });
      setRecentlyAddedItemId(id);
      // Clear the highlight id after the CSS animation completes (~1s plus a
      // small buffer) so a subsequent add re-triggers the animation.
      setTimeout(() => {
        setRecentlyAddedItemId((current) => (current === id ? null : current));
      }, 1200);
      return id;
    },
    [check],
  );

  const itemUpdated = useCallback(() => {
    // NOTE: this copies here because the code that
    // interacts with the items is mutating them directly.
    // TODO: make it not do that.
    setItems([...items]);
    check(items);
  }, [items, check]);

  const removeItem = useCallback((item: LiveCheckItem) => {
    setItems((oldItems) => {
      const index = oldItems.indexOf(item);
      if (index < 0) {
        return [];
      }

      const newItems = [...oldItems];
      newItems.splice(index, 1);
      return newItems;
    });
  }, []);

  const loadWatches = useCallback((watches: CheckWatch[]) => {
    const newItems: LiveCheckItem[] = watches.map((w) => ({
      id: uuidv4(),
      object: w.object,
      action: w.action,
      subject: w.subject,
      context: w.context ?? "",
      status: LiveCheckItemStatus.NOT_CHECKED,
      errorMessage: undefined,
    }));
    setItems(newItems);
  }, []);

  return useMemo(
    () => ({
      items: items,
      state: state,
      recentlyAddedItemId: recentlyAddedItemId,

      addItem,
      addWatch,
      itemUpdated,
      removeItem,
      loadWatches,
      clear: () => {
        setItems([]);
      },
    }),
    [items, state, recentlyAddedItemId, loadWatches, itemUpdated, addItem, addWatch, removeItem],
  );
}
