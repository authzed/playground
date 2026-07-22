import { LiveCheckItemStatus } from "../check";
import type { CheckTuple } from "../wasmRunners";

export interface CheckInput {
  resource: string;
  permission: string;
  subject: string;
  caveat_context?: string;
}

export function checkInputToWatch(i: CheckInput): CheckTuple {
  return {
    object: i.resource,
    action: i.permission,
    subject: i.subject,
    context: i.caveat_context ?? "",
  };
}

export function statusLabel(
  status: LiveCheckItemStatus,
): "allowed" | "denied" | "conditional" | "invalid" | "not_checked" {
  switch (status) {
    case LiveCheckItemStatus.FOUND:
      return "allowed";
    case LiveCheckItemStatus.NOT_FOUND:
      return "denied";
    case LiveCheckItemStatus.CAVEATED:
      return "conditional";
    case LiveCheckItemStatus.INVALID:
    case LiveCheckItemStatus.NOT_VALID:
      return "invalid";
    default:
      return "not_checked";
  }
}
