import { RelationshipFound } from "../spicedb-common/parsing";
import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import { ERROR_SOURCE_TO_ITEM } from "../components/panels/errordisplays";
import { LiveCheckService, LiveCheckStatus } from "./check";
import { DataStoreItemKind } from "./datastore";
import { LocalParseService } from "./localparse";
import { ValidationService } from "./validation";

export interface ProblemService {
  /**
   * stateKey is a shorthand key for watching for changes in the problem service.
   */
  stateKey: string;

  /**
   * isUpdating is true if any of the underlying services are currently processing.
   */
  isUpdating: boolean;

  /**
   * requestErrors are errors raised by the API calls.
   */
  requestErrors: DeveloperError[];

  /**
   * validationErrors are errors raised by the last call to validation.
   */
  validationErrors: DeveloperError[];

  /**
   * invalidRelationships are those validation relationships that are invalid, if any.
   */
  invalidRelationships: RelationshipFound[];

  /**
   * hasProblems is true if there are any problems.
   */
  hasProblems: boolean;

  /**
   * errorCount is the count of the errors found, if any.
   */
  errorCount: number;

  /**
   * getErrorCount returns the number of errors in the specific item.
   */
  getErrorCount: (kind: DataStoreItemKind) => number;

  /**
   * warnings are warnings raised by the last call to validation.
   */
  warnings: DeveloperWarning[];
}

interface ProblemsResult {
  requestErrors?: DeveloperError[];
  warnings?: DeveloperWarning[];
}

/**
 * useProblemService is a hook which exposes any problems (namespace parse errors,
 * validation errors, etc) raised by live check or validation.
 */
export function useProblemService(
  localParseService: LocalParseService,
  liveCheckService: LiveCheckService,
  validationService: ValidationService,
): ProblemService {
  // Collect the errors from the most recently run service.
  const problemsResult: ProblemsResult =
    (liveCheckService.state.lastRun?.getTime() ?? 0) >=
    (validationService.state.lastRun?.getTime() ?? 0)
      ? liveCheckService.state
      : validationService.state;
  const requestErrors = problemsResult.requestErrors ?? [];
  const invalidRelationships = localParseService.state.relationships.filter(
    (rel: RelationshipFound) => "errorMessage" in rel.parsed,
  );
  const errorCount = requestErrors.length + invalidRelationships.length;

  const getErrorCount = (kind: DataStoreItemKind) => {
    const allProblems = Array.from(requestErrors);
    allProblems.push(...(validationService.state.validationErrors ?? []));
    let foundCount = allProblems.filter(
      (problem: DeveloperError) =>
        ERROR_SOURCE_TO_ITEM[problem.source] === kind,
    ).length;
    if (kind === DataStoreItemKind.RELATIONSHIPS) {
      foundCount += invalidRelationships.length;
    }
    return foundCount;
  };

  const isUpdating =
    liveCheckService.state.status === LiveCheckStatus.CHECKING ||
    validationService.isRunning;
  const validationErrors = validationService.state.validationErrors ?? [];
  const stateKey = `${isUpdating}:${errorCount}-${validationErrors.length}-${invalidRelationships.length}`;

  return {
    stateKey: stateKey,
    isUpdating: isUpdating,
    errorCount: errorCount,
    requestErrors: requestErrors,
    validationErrors: validationErrors,
    invalidRelationships: invalidRelationships,
    getErrorCount: getErrorCount,
    warnings: problemsResult.warnings ?? [],
    hasProblems: errorCount > 0 || (problemsResult.warnings ?? []).length > 0,
  };
}
