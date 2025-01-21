import TabLabel from '../../playground-ui/TabLabel';
import { DeveloperError } from '../../spicedb-common/protodefs/developer/v1/developer';
import { Paper } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import PlaylistAddCheckIcon from '@material-ui/icons/PlaylistAddCheck';
import clsx from 'clsx';
import 'react-reflex/styles.css';
import { ValidationStatus } from '../../services/validation';
import { PanelProps, PanelSummaryProps } from './base/common';
import { DeveloperErrorDisplay, DeveloperSourceDisplay } from './errordisplays';
import { PlaygroundPanelLocation } from './panels';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    apiOutput: {
      fontFamily: 'Roboto Mono, monospace',
      padding: theme.spacing(2),
    },
    notRun: {
      color: theme.palette.grey[500],
    },
    validationErrorContainer: {
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  })
);

export function ValidationSummary(
  props: PanelSummaryProps<PlaygroundPanelLocation>
) {
  return (
    <TabLabel
      icon={
        <PlaylistAddCheckIcon
          htmlColor={props.services.validationService.validationStatusColor}
        />
      }
      title="Last Validation Run"
    />
  );
}

export function ValidationPanel(props: PanelProps<PlaygroundPanelLocation>) {
  const classes = useStyles();
  const validationState = props.services.validationService.state;

  return (
    <div
      className={clsx(classes.apiOutput, {
        [classes.notRun]: validationState.status === ValidationStatus.NOT_RUN,
      })}
    >
      {validationState.status === ValidationStatus.NOT_RUN && (
        <span>Validation Not Run</span>
      )}
      {validationState.status === ValidationStatus.CALL_ERROR && (
        <span>Validation Call Failed. Please try again shortly.</span>
      )}
      {validationState.status === ValidationStatus.RUNNING && (
        <CircularProgress />
      )}
      {validationState.status === ValidationStatus.VALIDATED && (
        <span>Validation Completed Successfully!</span>
      )}
      {validationState.status === ValidationStatus.VALIDATION_ERROR && (
        <span>
          {validationState.validationErrors?.map(
            (de: DeveloperError, index: number) => {
              return (
                <Paper className={classes.validationErrorContainer} key={index}>
                  <DeveloperSourceDisplay error={de} />
                  <DeveloperErrorDisplay error={de} />
                </Paper>
              );
            }
          )}
        </span>
      )}
    </div>
  );
}
