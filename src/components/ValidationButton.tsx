import { CheckCircle, CircleX, CirclePlay } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ValidationState, ValidationStatus } from "../services/validation";
import { DeveloperService } from "../spicedb-common/services/developerservice";

export function ValidateButton({
  conductValidation,
  validationState,
  developerService,
}: {
  conductValidation: () => void;
  validationState: ValidationState;
  developerService: DeveloperService;
}) {
  const valid = validationState.status === ValidationStatus.VALIDATED;
  const invalid = validationState.status === ValidationStatus.VALIDATION_ERROR;
  const loading = validationState.status === ValidationStatus.CALL_ERROR;
  // TODO: check this
  const notRun = validationState.status !== ValidationStatus.CALL_ERROR;

  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-row px-3 mr-2 w-48 items-center bg-muted rounded-xs">
        <ValidationIcon validationState={validationState} className="pr-2" />
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
  validationState,
  className,
}: {
  validationState: ValidationState;
  className: string;
}) {
  if (
    validationState.status === ValidationStatus.VALIDATED
  ) {
    return <CheckCircle className={className} fill="green" />;
  }

  if (
    validationState.status === ValidationStatus.VALIDATION_ERROR
  ) {
    return <CircleX className={className} fill="red" />;
  }

  return <CheckCircle className={className} />;
}
