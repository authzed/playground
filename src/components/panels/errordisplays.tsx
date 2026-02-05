import "react-reflex/styles.css";

import { Theme, createStyles, makeStyles } from "@material-ui/core/styles";
import { Link } from "@tanstack/react-router";
import { CircleX, MessageCircleWarning } from "lucide-react";

import { DataStoreItemKind, DataStorePaths } from "../../services/datastore";
import {
  DeveloperError,
  DeveloperError_Source,
  DeveloperWarning,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export const ERROR_SOURCE_TO_ITEM = {
  [DeveloperError_Source.SCHEMA]: DataStoreItemKind.SCHEMA,
  [DeveloperError_Source.RELATIONSHIP]: DataStoreItemKind.RELATIONSHIPS,
  [DeveloperError_Source.ASSERTION]: DataStoreItemKind.ASSERTIONS,
  [DeveloperError_Source.VALIDATION_YAML]: DataStoreItemKind.EXPECTED_RELATIONS,
  [DeveloperError_Source.CHECK_WATCH]: undefined,
  [DeveloperError_Source.UNKNOWN_SOURCE]: undefined,
};

const useErrorDisplayStyles = makeStyles((theme: Theme) =>
  createStyles({
    validationError: {
      border: 0,
    },
    foundVia: {
      marginTop: theme.spacing(1),
    },
    foundViaList: {
      margin: 0,
      fontFamily: "Roboto Mono, monospace",
      listStyleType: "none",
      "& li::after": {
        content: '" →"',
      },
      "& li:last-child::after": {
        content: '""',
      },
    },
    editorContainer: {
      display: "grid",
      alignItems: "center",
      gridTemplateColumns: "auto 1fr",
    },
    dot: {
      display: "inline-block",
      marginRight: theme.spacing(1),
      borderRadius: "50%",
      width: "8px",
      height: "8px",
    },
    progress: {
      color: theme.palette.text.primary,
    },
    success: {
      color: theme.palette.success.main,
    },
    gray: {
      color: theme.palette.grey[500],
    },
    warning: {
      color: theme.palette.warning.main,
    },
  }),
);

export function DeveloperErrorDisplay({ error }: { error: DeveloperError }) {
  const classes = useErrorDisplayStyles();
  return (
    <Alert variant="destructive">
      <CircleX />
      <AlertTitle>{error.message}</AlertTitle>
      {error.path.length > 0 && (
        <AlertDescription>
          Found Via:
          <ul className={classes.foundViaList}>
            {error.path.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
}

export function DeveloperWarningDisplay({ warning }: { warning: DeveloperWarning }) {
  return (
    <Alert>
      <MessageCircleWarning />
      <AlertTitle>{warning.message}</AlertTitle>
    </Alert>
  );
}

const useSourceDisplayStyles = makeStyles((theme: Theme) =>
  createStyles({
    link: {
      color: theme.palette.text.primary,
    },
    validationErrorContext: {
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.default,
    },
  }),
);

export function DeveloperWarningSourceDisplay({ warning }: { warning: DeveloperWarning }) {
  const classes = useSourceDisplayStyles();

  return (
    <div className={classes.validationErrorContext}>
      In
      <Link className={classes.link} to={DataStorePaths.Schema()}>
        Schema
      </Link>
      {/* NOTE: this is a guess; I think this was an unintentional omission. */}: {warning.message}
    </div>
  );
}

export function DeveloperSourceDisplay({ error }: { error: DeveloperError }) {
  const classes = useSourceDisplayStyles();

  // TODO: unify with error source above.
  return (
    <div>
      {error.source === DeveloperError_Source.SCHEMA && (
        <div className={classes.validationErrorContext}>
          In
          <Link className={classes.link} to={DataStorePaths.Schema()}>
            Schema
          </Link>
          :
        </div>
      )}
      {error.source === DeveloperError_Source.ASSERTION && (
        <div className={classes.validationErrorContext}>
          In
          <Link className={classes.link} to={DataStorePaths.Assertions()}>
            Assertions
          </Link>
          :
        </div>
      )}
      {error.source === DeveloperError_Source.RELATIONSHIP && (
        <div className={classes.validationErrorContext}>
          In
          <Link className={classes.link} to={DataStorePaths.Relationships()}>
            Test Data
          </Link>
          :
        </div>
      )}
      {error.source === DeveloperError_Source.VALIDATION_YAML && (
        <div className={classes.validationErrorContext}>
          In
          <Link className={classes.link} to={DataStorePaths.ExpectedRelations()}>
            Expected Relations
          </Link>
          :
        </div>
      )}
    </div>
  );
}
