import { CheckCircle, CircleX, CirclePlay } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DataStore } from "../services/datastore";
import { ValidationState, ValidationStatus } from "../services/validation";
import { DeveloperService } from "../spicedb-common/services/developerservice";

export function ValidateButton({
  conductValidation,
  datastore,
  validationState,
  developerService,
}: {
  conductValidation: () => void;
  datastore: DataStore;
  validationState: ValidationState;
  developerService: DeveloperService;
}) {
  const upToDate = validationState.validationDatastoreIndex === datastore.currentIndex();
  const valid = upToDate && validationState.status === ValidationStatus.VALIDATED;
  const invalid = upToDate && validationState.status === ValidationStatus.VALIDATION_ERROR;
  const loading = validationState.status === ValidationStatus.CALL_ERROR;
  const notRun = validationState.status !== ValidationStatus.CALL_ERROR && !upToDate;

  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-row px-3 mr-2 w-48 items-center bg-muted rounded-xs">
        <ValidationIcon datastore={datastore} validationState={validationState} className="pr-2" />
        {valid && "Validated!"}
        {invalid && "Failed to Validate"}
        {loading && "Dev service loading"}
        {notRun && "Validation not run"}
      </div>
      <Button
        disabled={
          developerService.state.status !== "ready" ||
          validationState.status === ValidationStatus.RUNNING
        }
        onClick={conductValidation}
        variant="outline"
      >
        <CirclePlay />
        Run
      </Button>
    </div>
  );
}

export function ValidationIcon({
  datastore,
  validationState,
  className,
}: {
  datastore: DataStore;
  validationState: ValidationState;
  className: string;
}) {
  if (
    validationState.status === ValidationStatus.VALIDATED &&
    datastore.currentIndex() === validationState.validationDatastoreIndex
  ) {
    return <CheckCircle className={className} fill="green" />;
  }

  if (
    validationState.status === ValidationStatus.VALIDATION_ERROR &&
    datastore.currentIndex() === validationState.validationDatastoreIndex
  ) {
    return <CircleX className={className} fill="red" />;
  }

  return <CheckCircle className={className} />;
}
