import type { AssistantStatus } from "../../services/assistant/store";
import type { AnnotationStatus } from "../../services/schemaAnnotations/store";
import type { ToggleState } from "../../services/schemaAnnotations/types";

// `count` is the number of resolvable, non-stale (fresh) annotation views —
// NOT the raw annotation count. Annotations can exist but all be stale or fail
// to resolve (e.g. after the schema is replaced wholesale), in which case
// nothing would render inline and there'd be no symbol to hover for the
// regenerate link, so we must still regenerate.
export function shouldGenerate(next: ToggleState, count: number): boolean {
  return next !== "off" && count === 0;
}

// Decide how our "generating" status should reconcile with the assistant turn
// lifecycle. `sawBusy` = have we observed the assistant actually running
// (streaming/executing_tools) since we started generating? We must NOT clear
// "generating" the instant we flip on, because the pending prompt submits on a
// later render — the assistant is still "idle" then. Only once we've seen it go
// busy and come back do we clear (idle) or surface an error.
export function reconcileGeneratingStatus(
  ourStatus: AnnotationStatus,
  assistantStatus: AssistantStatus,
  sawBusy: boolean,
): { status: AnnotationStatus; sawBusy: boolean } {
  if (ourStatus !== "generating") return { status: ourStatus, sawBusy: false };
  const busy = assistantStatus === "streaming" || assistantStatus === "executing_tools";
  if (busy) return { status: "generating", sawBusy: true };
  if (!sawBusy) return { status: "generating", sawBusy: false }; // turn not started yet — keep waiting
  if (assistantStatus === "error") return { status: "error", sawBusy: false };
  return { status: "idle", sawBusy: false };
}
