import {
  CaveatEvalInfo,
  CaveatEvalInfo_Result,
  CheckDebugTrace,
  CheckDebugTrace_Permissionship,
  CheckDebugTrace_PermissionType,
} from "../spicedb-common/protodefs/authzed/api/v1/debug_pb";
import type { JsonObject, JsonValue } from "@bufbuild/protobuf";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import clsx from "clsx";
import { LocalParseService } from "../services/localparse";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      backgroundColor: theme.palette.background.default,
      padding: theme.spacing(0.5),
    },
    dispatch: {
      padding: theme.spacing(0.5),
    },
    dispatchHeader: {
      display: "grid",
      gridTemplateColumns: "auto auto auto auto 1fr",
      columnGap: "4px",
      alignItems: "center",
    },
    success: {
      color: theme.palette.success.main,
    },
    subdispatches: {
      paddingLeft: theme.spacing(2),
    },
    permission: {
      color: "#1acc92",
    },
    relation: {
      color: "#ffa887",
    },
    resourceType: {
      color: "#ccc",
    },
    caveat: {
      color: "#ff4271",
    },
    subject: {
      color: "#9676ff",
      display: "grid",
      gridTemplateColumns: "auto auto auto auto 1fr",
      columnGap: "4px",
      alignItems: "center",
    },
    missingRequiredContext: {
      color: theme.palette.getContrastText(theme.palette.info.dark),
      backgroundColor: theme.palette.info.dark,
      padding: theme.spacing(1),
      margin: theme.spacing(1),
      marginLeft: theme.spacing(3),
      marginBottom: theme.spacing(2),
    },
  }),
);

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

export function CheckDebugTraceView(props: {
  trace: CheckDebugTrace;
  localParseService: LocalParseService;
}) {
  const classes = useStyles();
  const defaultExpanded: string[] = [];

  const appendExpanded = (t: CheckDebugTrace) => {
    if (!hasPermission(t)) {
      return;
    }

    t.resource?.objectId.split(",").forEach((resourceID: string) => {
      defaultExpanded.push(
        `${t.resource?.objectType}:${resourceID}#${t.permission}`,
      );
    });

    if (t.resolution.case === "subProblems") {
      t.resolution.value.traces.forEach(appendExpanded);
    }
  };

  appendExpanded(props.trace);

  // Compute a new key for the treeview to ensure it is rerendered from scratch.
  const key = `${props.trace.resource?.objectType}:${props.trace.resource?.objectId}#${props.trace.permission}@${props.trace.subject?.object?.objectType}:${props.trace.subject?.object?.objectId}#${props.trace.subject?.optionalRelation}`;

  return (
    <div className={classes.root}>
      <TreeView
        key={key}
        selected={[]}
        className={classes.root}
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        defaultExpanded={defaultExpanded}
      >
        <CheckDebugTraceItems {...props} />
      </TreeView>
    </div>
  );
}

function CheckDebugTraceItems(props: {
  trace: CheckDebugTrace;
  localParseService: LocalParseService;
}) {
  const classes = useStyles();

  return (
    <>
      {props.trace.resource?.objectId.split(",").map((resourceID) => {
        const result = props.trace.result;
        const isMember = hasPermission(props.trace);
        const isNotMember = hasNotPermission(props.trace);

        const children =
          props.trace.resolution.case === "subProblems"
            ? props.trace.resolution.value.traces.map((subTrace, index) => {
                return (
                  <CheckDebugTraceItems
                    key={index}
                    trace={subTrace}
                    localParseService={props.localParseService}
                  />
                );
              })
            : [];

        if (
          (props.trace.result ===
            CheckDebugTrace_Permissionship.HAS_PERMISSION ||
            props.trace.result ===
              CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION) &&
          props.trace.permissionType ===
            CheckDebugTrace_PermissionType.RELATION &&
          children.length === 0
        ) {
          children.push(
            <TreeItem
              nodeId="subject"
              label={
                <div className={classes.subject}>
                  <CheckCircleIcon
                    className={classes.success}
                    fontSize="small"
                  />
                  {props.trace.subject?.object?.objectType}:
                  {props.trace.subject?.object?.objectId}
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
            label={
              <div className={classes.dispatchHeader}>
                {isMember && (
                  <CheckCircleIcon
                    className={classes.success}
                    fontSize="small"
                  />
                )}
                {isNotMember && (
                  <HighlightOffIcon color="error" fontSize="small" />
                )}
                {result ===
                  CheckDebugTrace_Permissionship.CONDITIONAL_PERMISSION &&
                  props.trace.caveatEvaluationInfo?.result ===
                    CaveatEvalInfo_Result.MISSING_SOME_CONTEXT && (
                    <HelpOutlineIcon
                      fontSize="small"
                      style={{ color: "#8787ff" }}
                    />
                  )}
                <span>
                  <span className={classes.resourceType}>
                    {props.trace.resource?.objectType}
                  </span>
                  :{resourceID}
                </span>
                <span
                  className={clsx({
                    [classes.permission]:
                      props.trace.permissionType ===
                      CheckDebugTrace_PermissionType.PERMISSION,
                    [classes.relation]:
                      props.trace.permissionType ===
                      CheckDebugTrace_PermissionType.RELATION,
                  })}
                >
                  {props.trace?.permission}
                </span>
              </div>
            }
          >
            {props.trace.caveatEvaluationInfo?.caveatName && (
              <CaveatTreeItem
                evalInfo={props.trace.caveatEvaluationInfo}
                nodeIDPrefix={nodeID}
              />
            )}
            {children}
          </TreeItem>
        );
      })}
    </>
  );
}

function CaveatTreeItem(props: {
  evalInfo: CaveatEvalInfo;
  nodeIDPrefix: string;
}) {
  const classes = useStyles();

  return (
    <TreeItem
      nodeId={props.nodeIDPrefix + ":" + props.evalInfo.caveatName}
      label={
        <div className={classes.dispatchHeader}>
          {props.evalInfo.result === CaveatEvalInfo_Result.TRUE && (
            <CheckCircleIcon className={classes.success} fontSize="small" />
          )}
          {props.evalInfo.result === CaveatEvalInfo_Result.FALSE && (
            <HighlightOffIcon color="error" fontSize="small" />
          )}
          {props.evalInfo.result ===
            CaveatEvalInfo_Result.MISSING_SOME_CONTEXT && (
            <HelpOutlineIcon fontSize="small" style={{ color: "#8787ff" }} />
          )}
          <span>{props.evalInfo.caveatName}</span>
          <span className={classes.caveat}>caveat</span>
        </div>
      }
    >
      {props.evalInfo.partialCaveatInfo?.missingRequiredContext && (
        <div className={classes.missingRequiredContext}>
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
      <TreeItem nodeId="" label={label}>
        {isItemValue ? value : undefined}
      </TreeItem>
    );
  });
}

function ContextTreeValue(value: JsonValue) {
  if (value === null) {
    return [<code>null</code>, false];
  }
  if (typeof value === "boolean") {
    return [<code>{value.toString()}</code>, false];
  }
  if (Array.isArray(value)) {
    return [
      value.map((v) => {
        return <TreeItem nodeId="">{ContextTreeValue(v)}</TreeItem>;
      }),
      true,
    ];
  }
  // NOTE: we've already handled null and array above, so this will match on objects.
  if (typeof value === "object") {
    return [ContextTreeView(value), true];
  }
  // If we've gotten this far, we have a number or a string and we can render it straight out.
  return [<code>{value}</code>, false];
}
