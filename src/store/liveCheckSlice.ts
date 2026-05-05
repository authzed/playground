import { create } from "@bufbuild/protobuf";
import { createListenerMiddleware, createSlice, isAnyOf, PayloadAction } from "@reduxjs/toolkit";
import { setRelationships, setSchema } from "./editorSlice";
import { DebugInformation } from "@/spicedb-common/protodefs/authzed/api/v1/debug_pb";
import { parseRelationship } from "@/spicedb-common/parsing";
import { v4 as uuidv4 } from "uuid";
import {
  DeveloperService,
  DeveloperServiceError,
} from "@/spicedb-common/services/developerservice";
import {
  CheckOperationParametersSchema,
  CheckOperationsResult_Membership,
  DeveloperError,
  DeveloperResponse,
  DeveloperWarning,
} from "@/spicedb-common/protodefs/developer/v1/developer_pb";
import { AppDispatch, AppThunk, RootState } from ".";

// TODO: Convert these to string unions?
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

export type LiveCheckItemContents = {
  object: string;
  action: string;
  subject: string;
  context: string;
}

export type LiveCheckItem = LiveCheckItemContents & {
  id: string;
  status: LiveCheckItemStatus;
  errorMessage: string | undefined;
  debugInformation?: DebugInformation;
}

type LiveCheckState = {
  items: LiveCheckItem[];
  status: LiveCheckStatus;
  lastRun?: Date;
  requestErrors?: DeveloperError[];
  serverErr?: DeveloperServiceError;
  warnings?: DeveloperWarning[];
}

const initialState: LiveCheckState = {
  items: [] satisfies LiveCheckItem[],
  status: LiveCheckStatus.NEVER_RUN,
}

// TODO: figure out where and how these items are actually modified
export const liveCheckSlice = createSlice({
  name: "liveCheck",
  initialState,
  reducers: {
  itemAdded: (state) => {
    state.items.push({
      id: uuidv4(),
      object: "",
      action: "",
      subject: "",
      context: "",
      status: LiveCheckItemStatus.NOT_CHECKED,
      errorMessage: undefined,
    })
  },
  itemContentsUpdated: (state, action: PayloadAction<{id: string, contents: LiveCheckItemContents}>) => {
    const indexToUpdate = state.items.findIndex(item => item.id === action.payload.id)
    if (indexToUpdate === -1) {
      return
    }
    state.items[indexToUpdate] = {
      ...state.items[indexToUpdate],
      ...action.payload.contents,
    }
  },
  itemRemoved: (state, action: PayloadAction<LiveCheckItem>) => {
    state.items = state.items.filter(item => item !== action.payload)
  },
  resetRequested: (state) => {
    state.items = []
  },
  statusUpdated: (state, action: PayloadAction<LiveCheckStatus>) => {
    state.status = action.payload
  },
  checkErrored: (state) => {
    state.status = LiveCheckStatus.SERVICE_ERROR
    state.lastRun = new Date()
    state.requestErrors = []
    state.serverErr = "Cannot instantiate developer service. Please make sure you have WebAssembly enabled."
  },
  checkCompleted: (state, action: PayloadAction<Omit<LiveCheckState, "items">>) => {
    return {
      ...state,
      ...action.payload,
    }
  },
  }
})

export const { itemAdded, itemContentsUpdated, itemRemoved, resetRequested, statusUpdated, checkErrored, checkCompleted } = liveCheckSlice.actions

 
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
  schema: string,
  relationships: string,
  items: LiveCheckItem[],
): [DeveloperResponse, DeveloperWarning[]] | undefined {
  const request = developerService.newRequest(schema, relationships);
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

const runCheck = (itemsToCheck: LiveCheckItem[]): AppThunk => (dispatch, getState) => {
  // TODO: get service status here
  if (devServiceStatus !== "ready") {
    return;
  }

  const { editor: { schema, relationships }} = getState()
  dispatch(statusUpdated(LiveCheckStatus.CHECKING))
  const r = runEditCheckWasm(developerService, schema, relationships, itemsToCheck);
  if (r === undefined) {
    if (itemsToCheck.length > 0) {
      dispatch(checkErrored())
    } else {
      dispatch(statusUpdated(LiveCheckStatus.NOT_CHECKING))
    }
    return;
  }

  const [response, warnings] = r;
  const serverErr = response.internalError || undefined;
  const devErrs = response.developerErrors
    ? response.developerErrors.inputErrors
    : [];
  const status = serverErr
    ? LiveCheckStatus.SERVICE_ERROR
    : devErrs.length > 0
      ? LiveCheckStatus.PARSE_ERROR
      : LiveCheckStatus.NOT_CHECKING;

  dispatch(checkCompleted({
    status: status,
    lastRun: new Date(),
    requestErrors: devErrs,
    serverErr: serverErr,
    warnings: warnings,
  }))
};

// TODO: figure out how developer service would be injected
const liveCheckListener = createListenerMiddleware()
const startAppListening = liveCheckListener.startListening.withTypes<RootState, AppDispatch>()

startAppListening({
  matcher: isAnyOf(setSchema, setRelationships, itemAdded, itemRemoved, resetRequested),
  effect: async (_, listenerApi) => {
    const items = listenerApi.getState().liveCheck.items
    listenerApi.dispatch(runCheck(items))
  }
})

export default liveCheckSlice.reducer
