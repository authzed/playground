import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import { DeveloperService } from "../spicedb-common/services/developerservice";
import { useGoogleAnalytics } from "../playground-ui/GoogleAnalyticsHook";
import { useTheme } from "@material-ui/core/styles";
import { useState } from "react";
import "react-reflex/styles.css";
import { DataStore, DataStoreItemKind } from "../services/datastore";
import { buildAssertionsYaml, buildValidationBlockYaml } from "./validationfileformat";
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

export interface ValidationResult {
  updatedValidationYaml: string | null;
}

export type ValidationCallback = (validated: boolean, response: ValidationResult) => boolean;

/**
 * runsValidation over the data found in the datastore, invoking the callback when complete
 * and setValidationState on each state change.
 */
function runValidation(
  datastore: DataStore,
  developerService: DeveloperService,
  callback: ValidationCallback,
  setValidationState: (state: ValidationState) => void,
) {
  setValidationState({
    status: ValidationStatus.RUNNING,
  });

  const datastoreIndex = datastore.currentIndex();

  const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "";
  const relationshipsString = datastore.getSingletonByKind(
    DataStoreItemKind.RELATIONSHIPS,
  ).editableContents;
  const request = developerService.newRequest(schema, relationshipsString);
  if (request === undefined) {
    setValidationState({
      status: ValidationStatus.CALL_ERROR,
    });
    return;
  }

  const validationYaml = buildValidationBlockYaml(datastore);
  const assertionsYaml = buildAssertionsYaml(datastore);

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
    setValidationState({
      status: ValidationStatus.VALIDATION_ERROR,
      validationDatastoreIndex: datastoreIndex,
      runError: response.internalError,
      lastRun: new Date(),
      warnings: warnings,
    });
    return;
  }

  if (response.developerErrors) {
    inputDevErrors.push(...response.developerErrors.inputErrors);
  }

  const validated = inputDevErrors.length === 0 && validationDevErrors.length === 0;
  setValidationState({
    status: validated ? ValidationStatus.VALIDATED : ValidationStatus.VALIDATION_ERROR,
    requestErrors: inputDevErrors,
    validationErrors: validationDevErrors,
    validationDatastoreIndex: datastoreIndex,
    lastRun: new Date(),
    warnings: warnings,
  });
  callback(validated, { updatedValidationYaml: updatedValidationYaml });
}

export interface ValidationService {
  state: ValidationState;
  isRunning: boolean;
  validationStatusColor: string;
  conductValidation: (callback: ValidationCallback) => void;
}

export function useValidationService(
  developerService: DeveloperService,
  datastore: DataStore,
): ValidationService {
  const theme = useTheme();

  const [validationState, setValidationState] = useState<ValidationState>({
    status: ValidationStatus.NOT_RUN,
  });

  const validationStatusColor = {
    [ValidationStatus.NOT_RUN]: "grey",
    [ValidationStatus.CALL_ERROR]: "grey",
    [ValidationStatus.RUNNING]: "white",
    [ValidationStatus.VALIDATED]: theme.palette.success.main,
    [ValidationStatus.VALIDATION_ERROR]: theme.palette.error.main,
  }[validationState.status];

  const { pushEvent } = useGoogleAnalytics();

  const conductValidation = (callback: ValidationCallback) => {
    runValidation(
      datastore,
      developerService,
      (validated: boolean, result: ValidationResult) => {
        pushEvent("conduct-validation", {
          success: validated,
        });
        return callback(validated, result);
      },
      (state: ValidationState) => {
        setValidationState(state);
        if (state.runError) {
          toast.error("Error running validation", {
            description: state.runError,
          });
        }
      },
    );
  };

  return {
    state: validationState,
    isRunning: validationState.status === ValidationStatus.RUNNING,
    validationStatusColor: validationStatusColor,
    conductValidation: conductValidation,
  };
}
