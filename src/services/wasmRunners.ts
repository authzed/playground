import { create } from "@bufbuild/protobuf";

import { parseRelationship } from "../spicedb-common/parsing";
import type { DebugInformation } from "../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import {
  CheckOperationParametersSchema,
  CheckOperationsResult_Membership,
  type DeveloperError,
  type DeveloperResponse,
  type DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import type { DeveloperService } from "../spicedb-common/services/developerservice";

/** Formats a check tuple as `object#action@subject[context]`, defaulting a bare subject to `#...`. */
export function checkTupleString(
  object: string,
  action: string,
  subject: string,
  context: string,
): string {
  const subj = subject.includes("#") ? subject : `${subject}#...`;
  const caveat = context ? `[${context}]` : "";
  return `${object}#${action}@${subj}${caveat}`;
}

export interface CheckTuple {
  object: string;
  action: string;
  subject: string;
  context: string;
}

export type CheckOutcome =
  | { kind: "unparseable" }
  | { kind: "error"; message: string }
  // The check was queued but its callback never fired (e.g. the developer
  // service hit an internal error mid-execute). Distinct from "error" so
  // consumers can treat it as neutral/not-yet-resolved rather than a failure.
  | { kind: "pending" }
  | { kind: "caveated"; debugInformation?: DebugInformation; missingContext?: string[] }
  | { kind: "member"; debugInformation?: DebugInformation }
  | { kind: "not_member"; debugInformation?: DebugInformation };

export function runChecksAgainst(
  developerService: DeveloperService,
  schema: string,
  relationships: string,
  tuples: CheckTuple[],
):
  | { outcomes: CheckOutcome[]; warnings: DeveloperWarning[]; response: DeveloperResponse }
  | undefined {
  const request = developerService.newRequest(schema, relationships);
  if (request === undefined) return undefined;

  let warnings: DeveloperWarning[] = [];
  request.schemaWarnings((result) => {
    warnings = result.warnings;
  });

  const outcomes: CheckOutcome[] = tuples.map(() => ({ kind: "pending" }));
  tuples.forEach((tuple, i) => {
    const parsed = parseRelationship(
      checkTupleString(tuple.object, tuple.action, tuple.subject, tuple.context),
    );
    if (parsed === undefined) {
      outcomes[i] = { kind: "unparseable" };
      return;
    }
    request.check(
      create(CheckOperationParametersSchema, {
        resource: parsed.resourceAndRelation!,
        subject: parsed.subject!,
        caveatContext: parsed.caveat?.context,
      }),
      (result) => {
        if (result.checkError) {
          outcomes[i] = { kind: "error", message: result.checkError.message };
          return;
        }
        if (
          result.partialCaveatInfo?.missingRequiredContext &&
          result.partialCaveatInfo.missingRequiredContext.length > 0
        ) {
          outcomes[i] = {
            kind: "caveated",
            debugInformation: result.resolvedDebugInformation,
            missingContext: result.partialCaveatInfo.missingRequiredContext,
          };
          return;
        }
        outcomes[i] =
          result.membership === CheckOperationsResult_Membership.MEMBER
            ? { kind: "member", debugInformation: result.resolvedDebugInformation }
            : { kind: "not_member", debugInformation: result.resolvedDebugInformation };
      },
    );
  });

  const response = request.execute();
  return { outcomes, warnings, response };
}

export interface ValidationOutcome {
  requestErrors: DeveloperError[];
  validationErrors: DeveloperError[];
  updatedValidationYaml: string | null;
  warnings: DeveloperWarning[];
  internalError?: string;
}

export function runValidationAgainst(
  developerService: DeveloperService,
  schema: string,
  relationships: string,
  assertionsYaml: string,
  validationYaml: string,
): ValidationOutcome | undefined {
  const request = developerService.newRequest(schema, relationships);
  if (request === undefined) return undefined;

  const requestErrors: DeveloperError[] = [];
  const validationErrors: DeveloperError[] = [];

  request.runAssertions(assertionsYaml, (result) => {
    if (result.inputError) {
      requestErrors.push(result.inputError);
      return;
    }
    validationErrors.push(...result.validationErrors);
  });

  let updatedValidationYaml: string | null = null;
  request.runValidation(validationYaml, (result) => {
    updatedValidationYaml = result.updatedValidationYaml;
    if (result.inputError) {
      requestErrors.push(result.inputError);
      return;
    }
    validationErrors.push(...result.validationErrors);
  });

  let warnings: DeveloperWarning[] = [];
  request.schemaWarnings((result) => {
    warnings = result.warnings;
  });

  const response = request.execute();
  if (response.internalError) {
    return {
      requestErrors,
      validationErrors,
      updatedValidationYaml,
      warnings,
      internalError: response.internalError,
    };
  }
  if (response.developerErrors) {
    requestErrors.push(...response.developerErrors.inputErrors);
  }
  return { requestErrors, validationErrors, updatedValidationYaml, warnings };
}
