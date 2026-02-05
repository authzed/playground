import { parseRelationship } from "../spicedb-common/parsing";
import { DebugInformation } from "../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import {
  CheckOperationParametersSchema,
  CheckOperationsResult_Membership,
  DeveloperError,
  DeveloperResponse,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import {
  DeveloperService,
  DeveloperServiceError,
} from "../spicedb-common/services/developerservice";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DataStore, DataStoreItemKind } from "./datastore";
import { create } from "@bufbuild/protobuf";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";

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

  addItem: () => void;
  itemUpdated: (item: LiveCheckItem) => void;
  removeItem: (item: LiveCheckItem) => void;
  clear: () => void;
}

function liveCheckItemToString(item: LiveCheckItem): string {
  let subject = item.subject;
  if (subject.indexOf("#") < 0) {
    subject = `${subject}#...`;
  }
  const caveat = item.context ? `[${item.context}]` : "";
  return `${item.object}#${item.action}@${subject}${caveat}`;
}

function runEditCheckWasm(
  developerService: DeveloperService,
  datastore: DataStore,
  items: LiveCheckItem[],
): [DeveloperResponse, DeveloperWarning[]] | undefined {
  const schema =
    datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ??
    "";
  const relationshipsString = datastore.getSingletonByKind(
    DataStoreItemKind.RELATIONSHIPS,
  ).editableContents;

  const request = developerService.newRequest(schema, relationshipsString);
  if (request === undefined) {
    return;
  }

  // Add a check for warnings.
  let warnings: DeveloperWarning[] = [];
  request.schemaWarnings((result) => {
    warnings = result.warnings;
  });

  // Build the relationships to be checked, validating as we go.
  items.forEach((item: LiveCheckItem) => {
    const parsed = parseRelationship(liveCheckItemToString(item));
    if (parsed === undefined) {
      item.status = LiveCheckItemStatus.NOT_VALID;
      item.debugInformation = undefined;
      return;
    }

    item.status = LiveCheckItemStatus.NOT_CHECKED;
    request.check(
      create(CheckOperationParametersSchema, {
        resource: parsed.resourceAndRelation!,
        subject: parsed.subject!,
        caveatContext: parsed.caveat?.context,
      }),
      (result) => {
        if (result.checkError) {
          item.status = LiveCheckItemStatus.INVALID;
          item.errorMessage = result.checkError.message;
          item.debugInformation = undefined;
          return;
        }

        if (
          result.partialCaveatInfo?.missingRequiredContext &&
          result.partialCaveatInfo?.missingRequiredContext.length > 0
        ) {
          item.status = LiveCheckItemStatus.CAVEATED;
          item.debugInformation = result.resolvedDebugInformation;
          item.errorMessage = undefined;
          return;
        }

        item.debugInformation = result.resolvedDebugInformation;
        item.status =
          result.membership === CheckOperationsResult_Membership.MEMBER
            ? LiveCheckItemStatus.FOUND
            : LiveCheckItemStatus.NOT_FOUND;
        item.errorMessage = undefined;
      },
    );
  });

  return [request.execute(), warnings];
}

/**
 * useLiveCheckService is a hook which manages the definitions of live checking,
 * including live parsing and check watches.
 */
export function useLiveCheckService(
  developerService: DeveloperService,
  datastore: DataStore,
): LiveCheckService {
  const [items, setItems] = useState<LiveCheckItem[]>([]);
  const [state, setState] = useState<LiveCheckRunState>({
    status: LiveCheckStatus.NEVER_RUN,
  });

  const devServiceStatus = developerService.state.status;
  const runCheck = (itemsToCheck: LiveCheckItem[]) => {
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
  };

  const check = useDebouncedCallback(runCheck, { wait: 500 });

  // Setup an effect which registers the listener for the datastore changes and processes items.
  useEffect(() => {
    return datastore.registerListener(() => {
      check(items);
    });
  }, [datastore, items, check]);

  // Setup an effect which runs the check initially once the developer service is ready.
  useEffect(() => {
    if (
      state.status === LiveCheckStatus.NEVER_RUN &&
      devServiceStatus === "ready"
    ) {
      check(items);
    }
  }, [state, items, check, devServiceStatus]);

  return {
    items: items,
    state: state,

    addItem: () => {
      const newItems = [
        ...items,
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
      setItems(newItems);
    },
    itemUpdated: () => {
      check(items);
    },
    removeItem: (item: LiveCheckItem) => {
      const index = items.indexOf(item);
      if (index < 0) {
        return;
      }

      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    },
    clear: () => {
      setItems([]);
    },
  };
}
