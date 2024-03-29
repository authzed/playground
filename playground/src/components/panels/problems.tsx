import TabLabel from '@code/playground-ui/src/TabLabel';
import { RelationshipFound } from '@code/spicedb-common/src/parsing';
import { DeveloperError } from '@code/spicedb-common/src/protodevdefs/developer/v1/developer';
import Paper from '@material-ui/core/Paper';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import clsx from 'clsx';
import React from 'react';
import 'react-reflex/styles.css';
import { Link } from 'react-router-dom';
import { DataStorePaths } from '../../services/datastore';
import { TourElementClass } from '../GuidedTour';
import { PanelProps, PanelSummaryProps, useSummaryStyles } from './base/common';
import { DeveloperErrorDisplay, DeveloperSourceDisplay } from './errordisplays';
import { PlaygroundPanelLocation } from './panels';

var _ = React;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    apiOutput: {
      fontFamily: 'Roboto Mono, monospace',
      padding: theme.spacing(2),
    },
    link: {
      color: theme.palette.text.primary,
    },
    errorContainer: {
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
      display: 'grid',
      gridTemplateRows: '1fr auto',
      width: '100%',
      columnGap: theme.spacing(2),
    },
    validationErrorContext: {
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.default,
    },
    tupleError: {
      padding: theme.spacing(1),
    },
    helpButton: {},
  })
);

/**
 * ProblemsSummary displays a summary of the problems found.
 */
export function ProblemsSummary(
  props: PanelSummaryProps<PlaygroundPanelLocation>
) {
  const classes = useSummaryStyles();
  const problemCount = props.services.problemService.problemCount;

  return (
    <div className={clsx(classes.problemTab, TourElementClass.problems)}>
      <TabLabel
        icon={
          <ErrorOutlineIcon
            htmlColor={props.services.problemService.hasProblems ? '' : 'grey'}
          />
        }
        title="Problems"
      />
      <span
        className={clsx(classes.badge, {
          [classes.failBadge]: problemCount > 0,
        })}
      >
        {problemCount}
      </span>
    </div>
  );
}

export function ProblemsPanel(props: PanelProps<PlaygroundPanelLocation>) {
  const classes = useStyles();

  return (
    <div className={clsx(classes.apiOutput)}>
      {!props.services.problemService.hasProblems && (
        <span>No problems found</span>
      )}
      {props.services.problemService.invalidRelationships.map(
        (invalid: RelationshipFound, index: number) => {
          if (!('errorMessage' in invalid.parsed)) {
            return;
          }

          return (
            <Paper className={classes.errorContainer} key={`ir${index}`}>
              <div>
                <div className={classes.validationErrorContext}>
                  In{' '}
                  <Link
                    className={classes.link}
                    to={DataStorePaths.Relationships()}
                  >
                    Test Relationships
                  </Link>
                  :
                </div>
                <div className={classes.tupleError}>
                  Invalid relationship <code>{invalid.text}</code> on line{' '}
                  {invalid.lineNumber + 1}: {invalid.parsed.errorMessage}
                </div>
              </div>
            </Paper>
          );
        }
      )}
      {props.services.problemService.requestErrors.map(
        (de: DeveloperError, index: number) => {
          return (
            <Paper className={classes.errorContainer} key={`de${index}`}>
              <div>
                <DeveloperSourceDisplay error={de} />
                <DeveloperErrorDisplay error={de} />
              </div>
            </Paper>
          );
        }
      )}
    </div>
  );
}
