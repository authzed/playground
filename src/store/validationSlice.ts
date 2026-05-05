import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import { AppThunk } from ".";
import { expectedRelationsUpdated } from "./editorSlice";
import { toast } from "sonner";

export enum ValidationStatus {
  NOT_RUN = 0,
  RUNNING = 1,
  VALIDATED = 2,
  VALIDATION_ERROR = 3,
  CALL_ERROR = 4,
}

export interface ValidationState {
  status: ValidationStatus;
  requestErrors?: DeveloperError[];
  validationErrors?: DeveloperError[];
  runError?: string | undefined;
  validationDatastoreIndex?: string;
  lastRun?: Date;
  warnings?: DeveloperWarning[];
}

const initialState: ValidationState = {
  status: ValidationStatus.NOT_RUN,
}

const validationSlice = createSlice({
  name: "validation",
  initialState,
  reducers: {
    statusUpdated: (state, action: PayloadAction<ValidationStatus>) => {
      state.status = action.payload
    },
    validationFailed: (_, action: PayloadAction<{ error: string, warnings: DeveloperWarning[] }>) => {
      return {
        status: ValidationStatus.VALIDATION_ERROR,
        runError: action.payload.error,
        // TODO: date is supposed to be a bad thing here?
        lastRun: new Date(),
        warnings: action.payload.warnings,
      }
    },
    validationSucceeded: (_, action: PayloadAction<{requestErrors: DeveloperError[], validationErrors: DeveloperError[], warnings: DeveloperWarning[] }>) => {
      const validated = action.payload.requestErrors.length === 0 && action.payload.validationErrors.length === 0;
      return {
        status: validated ? ValidationStatus.VALIDATED : ValidationStatus.VALIDATION_ERROR,
        requestErrors: action.payload.requestErrors,
        validationErrors: action.payload.validationErrors,
        lastRun: new Date(),
        warnings: action.payload.warnings,
      }
    }
  }
})

export const {statusUpdated, validationSucceeded, validationFailed} = validationSlice.actions

export const conductValidation = (): AppThunk => (dispatch, getState) => {
  dispatch(statusUpdated(ValidationStatus.RUNNING))

  const { schema, relationships, assertions, expectedRelations } = getState().editor

  const request = developerService.newRequest(schema, relationships);
  if (request === undefined) {
    dispatch(statusUpdated(ValidationStatus.CALL_ERROR))
    return;
  }

  // TODO: this is just grabbing the key and making sure it's nonempty, or else
  // returning ""
  const validationYaml = expectedRelations || "{}"
  const assertionsYaml = assertions || "{}"

  const inputDevErrors: DeveloperError[] = [];
  const validationDevErrors: DeveloperError[] = [];

  request.runAssertions(assertionsYaml, (result) => {
    if (result.inputError) {
      inputDevErrors.push(result.inputError);
      return;
    }

    validationDevErrors.push(...result.validationErrors);
  });

  let updatedValidationYaml: string | null = null;
  request.runValidation(validationYaml, (result) => {
    updatedValidationYaml = result.updatedValidationYaml;

    if (result.inputError) {
      inputDevErrors.push(result.inputError);
      return;
    }

    validationDevErrors.push(...result.validationErrors);
  });

  let warnings: DeveloperWarning[] = [];
  request.schemaWarnings((result) => {
    warnings = result.warnings;
  });

  const response = request.execute();
  if (response.internalError) {
    dispatch(validationFailed({
      error: response.internalError,
      warnings,
    }))
    toast.error("Error running validation", {
      description: response.internalError,
    });
    return;
  }

  if (response.developerErrors) {
    inputDevErrors.push(...response.developerErrors.inputErrors);
  }

  dispatch(validationSucceeded({
    requestErrors: inputDevErrors,
    validationErrors: validationDevErrors,
    warnings,
  }))
  if (updatedValidationYaml) {
    dispatch(expectedRelationsUpdated(updatedValidationYaml))
  }
};

export default validationSlice.reducer
