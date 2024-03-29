import { DeveloperService } from '@code/spicedb-common/src/services/developerservice';
import Button from '@material-ui/core/Button';
import { Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import ErrorIcon from '@material-ui/icons/Error';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import clsx from 'clsx';
import React from 'react';
import 'react-reflex/styles.css';
import { DataStore } from '../services/datastore';
import { ValidationState, ValidationStatus } from '../services/validation';
import { TourElementClass } from './GuidedTour';

var _ = React;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    gcm: {
      color: 'green',
      display: 'inherit',
    },
    rem: {
      color: 'red',
      display: 'inherit',
    },
    gray: {
      color: 'gray',
      display: 'inherit',
    },
    lastRun: {
      display: 'grid',
      gridTemplateColumns: 'auto 150px',
      alignItems: 'center',
      columnGap: theme.spacing(1),
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      height: '100%',
      padding: '4px',
      paddingLeft: '8px',
    },
    validated: {
      backgroundColor: fade(theme.palette.success.light, 0.2),
    },
    validationError: {
      backgroundColor: fade(theme.palette.error.light, 0.2),
    },
    validationDisplay: {
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      alignItems: 'center',
      columnGap: theme.spacing(1),
    },
  })
);

export function ValidateButton(props: {
  conductValidation: () => void;
  datastore: DataStore;
  validationState: ValidationState;
  developerService: DeveloperService;
}) {
  const validated =
    props.validationState.status === ValidationStatus.VALIDATED ||
    props.validationState.status === ValidationStatus.VALIDATION_ERROR;
  const upToDate =
    validated &&
    props.validationState.validationDatastoreIndex ===
      props.datastore.currentIndex();

  const classes = useStyles();

  return (
    <div className={classes.validationDisplay}>
      <div
        className={clsx(classes.lastRun, {
          [classes.validated]:
            upToDate &&
            props.validationState.status === ValidationStatus.VALIDATED,
          [classes.validationError]:
            upToDate &&
            props.validationState.status === ValidationStatus.VALIDATION_ERROR,
        })}
      >
        <ValidationIcon
          datastore={props.datastore}
          validationState={props.validationState}
        />
        {upToDate &&
          props.validationState.status === ValidationStatus.VALIDATED &&
          'Validated!'}
        {upToDate &&
          props.validationState.status === ValidationStatus.VALIDATION_ERROR &&
          'Failed to Validate'}
        {props.validationState.status === ValidationStatus.CALL_ERROR &&
          'Dev service loading'}
        {props.validationState.status !== ValidationStatus.CALL_ERROR &&
          !upToDate &&
          'Validation not run'}
      </div>
      <Button
        variant="contained"
        startIcon={<PlayCircleFilledIcon />}
        className={TourElementClass.run}
        disabled={
          props.developerService.state.status !== 'ready' ||
          props.validationState.status === ValidationStatus.RUNNING
        }
        onClick={props.conductValidation}
      >
        Run
      </Button>
    </div>
  );
}

export function ValidationIcon(props: {
  small?: boolean;
  datastore: DataStore;
  validationState: ValidationState;
}) {
  const classes = useStyles();
  if (
    props.validationState.status === ValidationStatus.VALIDATED &&
    props.datastore.currentIndex() ===
      props.validationState.validationDatastoreIndex
  ) {
    return (
      <span className={classes.gcm}>
        <CheckCircleIcon />
      </span>
    );
  }

  if (
    props.validationState.status === ValidationStatus.VALIDATION_ERROR &&
    props.datastore.currentIndex() ===
      props.validationState.validationDatastoreIndex
  ) {
    return (
      <span className={classes.rem}>
        <ErrorIcon />
      </span>
    );
  }

  return (
    <span className={classes.gray}>
      <CheckCircleOutlineIcon />
    </span>
  );
}
