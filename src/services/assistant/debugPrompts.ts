import { DeveloperError_Source } from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { LiveCheckItemStatus } from "../check";

export interface ErrorPromptInput {
  source: DeveloperError_Source;
  line: number;
  message: string;
  context: string;
}

export interface CheckWatchPromptInput {
  object: string;
  action: string;
  subject: string;
  context: string;
  status: LiveCheckItemStatus;
  errorMessage?: string;
}

function linePart(line: number): string {
  return line > 0 ? ` on line ${line}` : "";
}

function contextPart(context: string): string {
  const trimmed = context.trim();
  return trimmed ? ` (near \`${trimmed}\`)` : "";
}

/**
 * buildErrorPrompt turns a schema/assertion/validation/relationship error into a
 * short instruction that names the specific failure and asks the assistant to
 * diagnose and fix it. The assistant already receives full document state each
 * turn, so the prompt only needs to point at the failure — not re-embed the
 * schema.
 */
export function buildErrorPrompt(input: ErrorPromptInput): string {
  const { source, line, message, context } = input;
  const quoted = `"${message.trim()}"`;
  switch (source) {
    case DeveloperError_Source.SCHEMA:
      return `There's a schema error${linePart(line)}: ${quoted}${contextPart(
        context,
      )}. Diagnose the cause and fix the schema.`;
    case DeveloperError_Source.ASSERTION: {
      const assertion = context.trim() ? ` \`${context.trim()}\`` : "";
      return `The assertion${assertion} is failing: ${quoted}. Investigate why and fix it — correct the schema or relationships if the assertion is right, or the assertion itself if it's wrong.`;
    }
    case DeveloperError_Source.VALIDATION_YAML:
      return `There's a validation error${linePart(
        line,
      )}: ${quoted}. Investigate why the expected-relations validation is failing and fix it.`;
    case DeveloperError_Source.RELATIONSHIP:
      return `There's an error in the test relationships${linePart(line)}: ${quoted}${contextPart(
        context,
      )}. Fix the relationship.`;
    default:
      return `There's an error${linePart(line)}: ${quoted}${contextPart(
        context,
      )}. Diagnose the cause and fix it.`;
  }
}

function watchStatusPhrase(status: LiveCheckItemStatus): string {
  switch (status) {
    case LiveCheckItemStatus.NOT_FOUND:
      return "was denied";
    case LiveCheckItemStatus.INVALID:
      return "could not be evaluated";
    case LiveCheckItemStatus.NOT_VALID:
      return "could not be run against the current schema";
    case LiveCheckItemStatus.CAVEATED:
      return "is missing required context";
    default:
      return "did not succeed";
  }
}

/**
 * buildCheckWatchPrompt turns a failing live check watch into a debug request.
 */
export function buildCheckWatchPrompt(input: CheckWatchPromptInput): string {
  const { object, action, subject, context, status, errorMessage } = input;
  // Watch context is stored prefixed with "default:" by the Watches UI — strip
  // it for readability in the prompt.
  const rawContext = context.replace(/^default:/, "").trim();
  const ctxPart = rawContext ? ` with context \`${rawContext}\`` : "";
  const errPart = errorMessage?.trim() ? `: ${errorMessage.trim()}` : "";
  return `The permission check \`${object}#${action}@${subject}\`${ctxPart} ${watchStatusPhrase(
    status,
  )}${errPart}. Debug why and fix it.`;
}

/**
 * isDebuggableWatchStatus reports whether a watch is in a non-passing,
 * non-pending state that warrants the "Ask assistant to debug" affordance.
 */
export function isDebuggableWatchStatus(status: LiveCheckItemStatus): boolean {
  return (
    status === LiveCheckItemStatus.NOT_FOUND ||
    status === LiveCheckItemStatus.INVALID ||
    status === LiveCheckItemStatus.NOT_VALID ||
    status === LiveCheckItemStatus.CAVEATED
  );
}
