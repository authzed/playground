import { useState } from "react";
import { toast } from "sonner";

import { useGoogleAnalytics } from "../playground-ui/GoogleAnalyticsHook";
import { DataStore, DataStoreItemKind } from "../services/datastore";
import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import { DeveloperService } from "../spicedb-common/services/developerservice";

import { buildAssertionsYaml, buildValidationBlockYaml } from "./validationfileformat";
import { runValidationAgainst } from "./wasmRunners";

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
  setValidationState({ status: ValidationStatus.RUNNING });
  const datastoreIndex = datastore.currentIndex();

  const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents ?? "";
  const relationshipsString = datastore.getSingletonByKind(
    DataStoreItemKind.RELATIONSHIPS,
  ).editableContents;
  const assertionsYaml = buildAssertionsYaml(datastore);
  const validationYaml = buildValidationBlockYaml(datastore);

  const outcome = runValidationAgainst(
    developerService,
    schema,
    relationshipsString,
    assertionsYaml,
    validationYaml,
  );
  if (outcome === undefined) {
    setValidationState({ status: ValidationStatus.CALL_ERROR });
    return;
  }
  if (outcome.internalError) {
    setValidationState({
      status: ValidationStatus.VALIDATION_ERROR,
      validationDatastoreIndex: datastoreIndex,
      runError: outcome.internalError,
      lastRun: new Date(),
      warnings: outcome.warnings,
    });
    return;
  }

  const validated = outcome.requestErrors.length === 0 && outcome.validationErrors.length === 0;
  setValidationState({
    status: validated ? ValidationStatus.VALIDATED : ValidationStatus.VALIDATION_ERROR,
    requestErrors: outcome.requestErrors,
    validationErrors: outcome.validationErrors,
    validationDatastoreIndex: datastoreIndex,
    lastRun: new Date(),
    warnings: outcome.warnings,
  });
  callback(validated, { updatedValidationYaml: outcome.updatedValidationYaml });
}

export interface ValidationService {
  state: ValidationState;
  isRunning: boolean;
  conductValidation: (callback: ValidationCallback) => void;
}

export function useValidationService(
  developerService: DeveloperService,
  datastore: DataStore,
): ValidationService {
  const [validationState, setValidationState] = useState<ValidationState>({
    status: ValidationStatus.NOT_RUN,
  });

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
    conductValidation: conductValidation,
  };
}
