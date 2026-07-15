import { useState } from "react";

import type { LocalParseService } from "../../../services/localparse";
import type { CheckDebugTrace } from "../../../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import { CheckDebugTraceView } from "../../CheckDebugTraceView";

/**
 * TraceCard renders a check's `--explain` debug trace in the chat by reusing the
 * playground's existing recursive tree renderer. The tree is collapsible per
 * node (auto-focused on the relevant path), so the user sees a focused subset
 * and can expand any sub-problem on demand.
 */
export function TraceCard({
  trace,
  localParseService,
}: {
  trace: CheckDebugTrace;
  localParseService: LocalParseService;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded border border-chrome-divider text-xs">
      <button
        type="button"
        className="w-full px-2 py-1 text-left font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} check trace
      </button>
      {open && (
        <div className="max-h-80 overflow-auto border-t border-chrome-divider p-2">
          <CheckDebugTraceView trace={trace} localParseService={localParseService} />
        </div>
      )}
    </div>
  );
}
