import {
  DeveloperError,
  DeveloperError_Source,
} from '@code/spicedb-common/src/protodevdefs/developer/v1/developer';
import { Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import React from 'react';
import 'react-reflex/styles.css';
import { Link } from 'react-router-dom';
import { DataStoreItemKind, DataStorePaths } from '../../services/datastore';

var _ = React;

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
      fontFamily: 'Roboto Mono, monospace',
      listStyleType: 'none',
      '& li::after': {
        content: '" →"',
      },
      '& li:last-child::after': {
        content: '""',
      },
    },
    editorContainer: {
      display: 'grid',
      alignItems: 'center',
      gridTemplateColumns: 'auto 1fr',
    },
    dot: {
      display: 'inline-block',
      marginRight: theme.spacing(1),
      borderRadius: '50%',
      width: '8px',
      height: '8px',
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
  })
);

export function DeveloperErrorDisplay(props: { error: DeveloperError }) {
  const classes = useErrorDisplayStyles();
  return (
    <Alert
      className={classes.validationError}
      variant="outlined"
      severity="error"
    >
      {props.error.message}
      {!!props.error.path && props.error.path.length > 0 && (
        <div className={classes.foundVia}>
          Found Via:
          <ul className={classes.foundViaList}>
            {props.error.path.map((item: string, index: number) => {
              return <li key={index}>{item}</li>;
            })}
          </ul>
        </div>
      )}
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
  })
);

export function DeveloperSourceDisplay(props: { error: DeveloperError }) {
  const ve = props.error;
  const classes = useSourceDisplayStyles();

  // TODO: unify with error source above.
  return (
    <div>
      {ve.source === DeveloperError_Source.SCHEMA && (
        <div className={classes.validationErrorContext}>
          In{' '}
          <Link className={classes.link} to={DataStorePaths.Schema()}>
            Schema
          </Link>
          :
        </div>
      )}
      {ve.source === DeveloperError_Source.ASSERTION && (
        <div className={classes.validationErrorContext}>
          In{' '}
          <Link className={classes.link} to={DataStorePaths.Assertions()}>
            Assertions
          </Link>
          :
        </div>
      )}
      {ve.source === DeveloperError_Source.RELATIONSHIP && (
        <div className={classes.validationErrorContext}>
          In{' '}
          <Link className={classes.link} to={DataStorePaths.Relationships()}>
            Test Data
          </Link>
          :
        </div>
      )}
      {ve.source === DeveloperError_Source.VALIDATION_YAML && (
        <div className={classes.validationErrorContext}>
          In{' '}
          <Link
            className={classes.link}
            to={DataStorePaths.ExpectedRelations()}
          >
            Expected Relations
          </Link>
          :
        </div>
      )}
    </div>
  );
}
