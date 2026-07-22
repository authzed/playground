import {
  CaveatEvalInfo_Result,
  type CheckDebugTrace,
  CheckDebugTrace_PermissionType,
  CheckDebugTrace_Permissionship,
} from "../../spicedb-common/protodefs/authzed/api/v1/debug_pb";

function objectRefStr(ref?: { objectType: string; objectId: string }): string {
  return ref ? `${ref.objectType}:${ref.objectId}` : "?";
}

function subjectStr(subject?: {
  object?: { objectType: string; objectId: string };
  optionalRelation: string;
}): string {
  if (!subject?.object) return "?";
  const base = objectRefStr(subject.object);
  return subject.optionalRelation ? `${base}#${subject.optionalRelation}` : base;
}

function permishipLabel(p: CheckDebugTrace_Permissionship): string {
  switch (p) {
    case CheckDebugTrace_Permissionship.HAS_PERMISSION:
      return "allowed";
    case CheckDebugTrace_Permissionship.NO_PERMISSION:
      return "denied";
    case CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION:
      return "conditional";
    default:
      return "unknown";
  }
}

function caveatResultLabel(r: CaveatEvalInfo_Result): string {
  switch (r) {
    case CaveatEvalInfo_Result.TRUE:
      return "true";
    case CaveatEvalInfo_Result.FALSE:
      return "false";
    case CaveatEvalInfo_Result.MISSING_SOME_CONTEXT:
      return "missing context";
    default:
      return "unevaluated";
  }
}

function walk(trace: CheckDebugTrace, depth: number, lines: string[]): void {
  const indent = "  ".repeat(depth);
  const kind =
    trace.permissionType === CheckDebugTrace_PermissionType.PERMISSION ? "permission" : "relation";
  let line = `${indent}- ${objectRefStr(trace.resource)}#${trace.permission} (${kind}) => ${permishipLabel(trace.result)}`;
  if (trace.caveatEvaluationInfo) {
    line += ` [caveat ${trace.caveatEvaluationInfo.caveatName}: ${caveatResultLabel(trace.caveatEvaluationInfo.result)}]`;
  }
  if (trace.resolution.case === "wasCachedResult" && trace.resolution.value) {
    line += " (cached)";
  }
  lines.push(line);
  if (trace.resolution.case === "subProblems") {
    for (const sub of trace.resolution.value.traces) {
      walk(sub, depth + 1, lines);
    }
  }
}

/**
 * traceToText renders a CheckDebugTrace as an indented text tree (like
 * `zed ... --explain`) so the model can reason about WHY a check resolved the
 * way it did — which relation/permission branch granted or denied access, and
 * where a caveat was true/false/missing context.
 */
export function traceToText(trace: CheckDebugTrace): string {
  const lines: string[] = [`Check trace for subject ${subjectStr(trace.subject)}:`];
  walk(trace, 0, lines);
  return lines.join("\n");
}
