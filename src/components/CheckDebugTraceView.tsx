import type { JsonObject, JsonValue } from "@bufbuild/protobuf";
import { CheckCircle2, ChevronDown, ChevronRight, HelpCircle, XCircle } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { LocalParseService } from "../services/localparse";
import {
  CaveatEvalInfo,
  CaveatEvalInfo_Result,
  CheckDebugTrace,
  CheckDebugTrace_Permissionship,
  CheckDebugTrace_PermissionType,
} from "../spicedb-common/protodefs/authzed/api/v1/debug_pb";

const hasPermission = (t: CheckDebugTrace) => {
  return (
    t.result === CheckDebugTrace_Permissionship.HAS_PERMISSION ||
    (t.result === CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION &&
      t.caveatEvaluationInfo?.result === CaveatEvalInfo_Result.TRUE)
  );
};

const hasNotPermission = (t: CheckDebugTrace) => {
  return (
    t.result === CheckDebugTrace_Permissionship.NO_PERMISSION ||
    (t.result === CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION &&
      t.caveatEvaluationInfo?.result === CaveatEvalInfo_Result.FALSE)
  );
};

interface TreeItemProps {
  nodeId: string;
  label: React.ReactNode;
  defaultExpanded?: boolean;
  expandedSet?: Set<string>;
  children?: React.ReactNode;
}

function TreeItem({ nodeId, label, defaultExpanded, expandedSet, children }: TreeItemProps) {
  const initial =
    defaultExpanded !== undefined ? defaultExpanded : expandedSet ? expandedSet.has(nodeId) : false;
  const [expanded, setExpanded] = useState(initial);
  const hasChildren = !!children && (Array.isArray(children) ? children.length > 0 : true);

  return (
    <div>
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex size-4 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="size-4" />
        )}
        <div className="flex-1">{label}</div>
      </div>
      {expanded && hasChildren && <div className="ml-4">{children}</div>}
    </div>
  );
}

export function CheckDebugTraceView(props: {
  trace: CheckDebugTrace;
  localParseService: LocalParseService;
}) {
  const expandedSet = new Set<string>();

  const appendExpanded = (t: CheckDebugTrace) => {
    if (!hasPermission(t)) {
      return;
    }

    t.resource?.objectId.split(",").forEach((resourceID: string) => {
      expandedSet.add(`${t.resource?.objectType}:${resourceID}#${t.permission}`);
    });

    if (t.resolution.case === "subProblems") {
      t.resolution.value.traces.forEach(appendExpanded);
    }
  };

  appendExpanded(props.trace);

  // Compute a new key for the treeview to ensure it is rerendered from scratch.
  const key = `${props.trace.resource?.objectType}:${props.trace.resource?.objectId}#${props.trace.permission}@${props.trace.subject?.object?.objectType}:${props.trace.subject?.object?.objectId}#${props.trace.subject?.optionalRelation}`;

  return (
    <div key={key} className="bg-background p-1">
      <CheckDebugTraceItems {...props} expandedSet={expandedSet} />
    </div>
  );
}

function CheckDebugTraceItems(props: {
  trace: CheckDebugTrace;
  localParseService: LocalParseService;
  expandedSet: Set<string>;
}) {
  return (
    <>
      {props.trace.resource?.objectId.split(",").map((resourceID) => {
        const result = props.trace.result;
        const isMember = hasPermission(props.trace);
        const isNotMember = hasNotPermission(props.trace);

        const children: React.ReactNode[] =
          props.trace.resolution.case === "subProblems"
            ? props.trace.resolution.value.traces.map((subTrace, index) => {
                return (
                  <CheckDebugTraceItems
                    key={index}
                    trace={subTrace}
                    localParseService={props.localParseService}
                    expandedSet={props.expandedSet}
                  />
                );
              })
            : [];

        if (
          (props.trace.result === CheckDebugTrace_Permissionship.HAS_PERMISSION ||
            props.trace.result === CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION) &&
          props.trace.permissionType === CheckDebugTrace_PermissionType.RELATION &&
          children.length === 0
        ) {
          children.push(
            <TreeItem
              key="subject"
              nodeId="subject"
              defaultExpanded={false}
              label={
                <div
                  className="grid items-center gap-x-1"
                  style={{
                    gridTemplateColumns: "auto auto auto auto 1fr",
                    color: "#9676ff",
                  }}
                >
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {props.trace.subject?.object?.objectType}:{props.trace.subject?.object?.objectId}
                  {props.trace.subject?.optionalRelation &&
                    `#${props.trace.subject?.optionalRelation}`}
                </div>
              }
            />,
          );
        }

        const nodeID = `${props.trace.resource?.objectType}:${resourceID}#${props.trace.permission}`;

        return (
          <TreeItem
            key={resourceID}
            nodeId={nodeID}
            expandedSet={props.expandedSet}
            label={
              <div
                className="grid items-center gap-x-1"
                style={{ gridTemplateColumns: "auto auto auto auto 1fr" }}
              >
                {isMember && <CheckCircle2 className="size-4 text-emerald-500" />}
                {isNotMember && <XCircle className="size-4 text-destructive" />}
                {result === CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION &&
                  props.trace.caveatEvaluationInfo?.result ===
                    CaveatEvalInfo_Result.MISSING_SOME_CONTEXT && (
                    <HelpCircle className="size-4" style={{ color: "#8787ff" }} />
                  )}
                <span>
                  <span style={{ color: "#ccc" }}>{props.trace.resource?.objectType}</span>:
                  {resourceID}
                </span>
                <span
                  className={cn({
                    "text-[#1acc92]":
                      props.trace.permissionType === CheckDebugTrace_PermissionType.PERMISSION,
                    "text-[#ffa887]":
                      props.trace.permissionType === CheckDebugTrace_PermissionType.RELATION,
                  })}
                >
                  {props.trace?.permission}
                </span>
              </div>
            }
          >
            {props.trace.caveatEvaluationInfo?.caveatName && (
              <CaveatTreeItem evalInfo={props.trace.caveatEvaluationInfo} nodeIDPrefix={nodeID} />
            )}
            {children}
          </TreeItem>
        );
      })}
    </>
  );
}

function CaveatTreeItem(props: { evalInfo: CaveatEvalInfo; nodeIDPrefix: string }) {
  return (
    <TreeItem
      nodeId={props.nodeIDPrefix + ":" + props.evalInfo.caveatName}
      label={
        <div
          className="grid items-center gap-x-1"
          style={{ gridTemplateColumns: "auto auto auto auto 1fr" }}
        >
          {props.evalInfo.result === CaveatEvalInfo_Result.TRUE && (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          {props.evalInfo.result === CaveatEvalInfo_Result.FALSE && (
            <XCircle className="size-4 text-destructive" />
          )}
          {props.evalInfo.result === CaveatEvalInfo_Result.MISSING_SOME_CONTEXT && (
            <HelpCircle className="size-4" style={{ color: "#8787ff" }} />
          )}
          <span>{props.evalInfo.caveatName}</span>
          <span style={{ color: "#ff4271" }}>caveat</span>
        </div>
      }
    >
      {props.evalInfo.partialCaveatInfo?.missingRequiredContext && (
        <div className="m-2 mb-4 ml-6 rounded-md bg-blue-900/40 p-2 text-blue-50">
          Missing required caveat context fields:{" "}
          {props.evalInfo.partialCaveatInfo.missingRequiredContext.join(", ")}
        </div>
      )}
      {ContextTreeView(props.evalInfo.context)}
    </TreeItem>
  );
}

function ContextTreeView(context: JsonObject | undefined) {
  if (context === undefined) {
    return null;
  }

  if (context === null) {
    return null;
  }

  return Object.keys(context).map((key) => {
    let label = <span>{key}</span>;
    const [value, isItemValue] = ContextTreeValue(context[key]);
    if (!isItemValue) {
      label = (
        <span>
          {key}: {value}
        </span>
      );
    }

    return (
      <TreeItem key={key} nodeId="" label={label}>
        {isItemValue ? value : undefined}
      </TreeItem>
    );
  });
}

function ContextTreeValue(value: JsonValue): [React.ReactNode, boolean] {
  if (value === null) {
    return [<code key="null">null</code>, false];
  }
  if (typeof value === "boolean") {
    return [<code key="bool">{value.toString()}</code>, false];
  }
  if (Array.isArray(value)) {
    return [
      value.map((v, idx) => {
        return (
          <TreeItem key={idx} nodeId="" label={<></>}>
            {ContextTreeValue(v)[0]}
          </TreeItem>
        );
      }),
      true,
    ];
  }
  // NOTE: we've already handled null and array above, so this will match on objects.
  if (typeof value === "object") {
    return [ContextTreeView(value), true];
  }
  // If we've gotten this far, we have a number or a string and we can render it straight out.
  return [<code key="value">{value}</code>, false];
}
