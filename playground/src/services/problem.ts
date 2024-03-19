import { RelationshipFound } from '@code/spicedb-common/src/parsing';
import { DeveloperError } from '@code/spicedb-common/src/protodevdefs/developer/v1/developer';
import { ERROR_SOURCE_TO_ITEM } from '../components/panels/errordisplays';
import { LiveCheckService, LiveCheckStatus } from './check';
import { DataStoreItemKind } from './datastore';
import { LocalParseService } from './localparse';
import { ValidationService } from './validation';

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
   * hasProblems indicates whether any problems were found.
   */
  hasProblems: boolean;

  /**
   * problemCount is the count of the problems found, if any.
   */
  problemCount: number;

  /**
   * getProblemCount returns the number of errors in the specific item.
   */
  getProblemCount: (kind: DataStoreItemKind) => number;
}

interface ProblemsResult {
  requestErrors?: DeveloperError[];
}

/**
 * useProblemService is a hook which exposes any problems (namespace parse errors,
 * validation errors, etc) raised by live check or validation.
 */
export function useProblemService(
  localParseService: LocalParseService,
  liveCheckService: LiveCheckService,
  validationService: ValidationService
): ProblemService {
  // Collect the errors from the most recently run service.
  const problemsResult: ProblemsResult =
    (liveCheckService.state.lastRun?.getTime() ?? 0) >=
    (validationService.state.lastRun?.getTime() ?? 0)
      ? liveCheckService.state
      : validationService.state;
  const requestErrors = problemsResult.requestErrors ?? [];
  const invalidRelationships = localParseService.state.relationships.filter(
    (rel: RelationshipFound) => 'errorMessage' in rel.parsed
  );
  const problemCount = requestErrors.length + invalidRelationships.length;

  const getProblemCount = (kind: DataStoreItemKind) => {
    const allProblems = Array.from(requestErrors);
    allProblems.push(...(validationService.state.validationErrors ?? []));
    let foundCount = allProblems.filter(
      (problem: DeveloperError) => ERROR_SOURCE_TO_ITEM[problem.source] === kind
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
  const stateKey = `${isUpdating}:${problemCount}-${validationErrors.length}-${invalidRelationships.length}`;

  return {
    stateKey: stateKey,
    isUpdating: isUpdating,
    hasProblems: problemCount > 0,
    problemCount: problemCount,
    requestErrors: requestErrors,
    validationErrors: validationErrors,
    invalidRelationships: invalidRelationships,
    getProblemCount: getProblemCount,
  };
}
