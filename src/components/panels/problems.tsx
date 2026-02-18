import "react-reflex/styles.css";

import Paper from "@material-ui/core/Paper";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";

import TabLabel from "../../playground-ui/TabLabel";
import { DataStorePaths } from "../../services/datastore";
import {
  DeveloperError,
  DeveloperWarning,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { TourElementClass } from "../GuidedTour";

import { PanelProps, PanelSummaryProps, useSummaryStyles } from "./base/common";
import {
  DeveloperErrorDisplay,
  DeveloperSourceDisplay,
  DeveloperWarningDisplay,
  DeveloperWarningSourceDisplay,
} from "./errordisplays";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    apiOutput: {
      fontFamily: "Roboto Mono, monospace",
      padding: theme.spacing(2),
    },
    link: {
      color: theme.palette.text.primary,
    },
    errorContainer: {
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
      display: "grid",
      gridTemplateRows: "1fr auto",
      width: "100%",
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
  }),
);

/**
 * ProblemsSummary displays a summary of the problems found.
 */
export function ProblemsSummary(props: PanelSummaryProps) {
  const classes = useSummaryStyles();
  const errorCount = props.services.problemService.errorCount;
  const warningCount = props.services.problemService.warnings.length;

  return (
    <div className={clsx(classes.problemTab, TourElementClass.problems)}>
      <TabLabel
        icon={
          <ErrorOutlineIcon
            htmlColor={props.services.problemService.errorCount > 0 ? "" : "grey"}
          />
        }
        title="Problems"
      />
      <span
        className={clsx(classes.badge, {
          [classes.failBadge]: errorCount > 0,
        })}
      >
        {errorCount}
      </span>
      <span
        className={clsx(classes.badge, {
          [classes.warningBadge]: warningCount > 0,
        })}
      >
        {warningCount}
      </span>
    </div>
  );
}

export function ProblemsPanel({ services }: PanelProps) {
  const classes = useStyles();

  return (
    <div className={clsx(classes.apiOutput)}>
      {!services.problemService.hasProblems && <span>No problems found</span>}
      {services.problemService.invalidRelationships.map(
        // NOTE: an index is appropriate here because a user could theoretically
        // write a duplicate relationship, and the position makes some sense as a key
        (invalid, index) => {
          if (!("errorMessage" in invalid.parsed)) {
            return <div key={index} />;
          }

          return (
            <Paper className={classes.errorContainer} key={index}>
              <div>
                <div className={classes.validationErrorContext}>
                  In
                  <Link className={classes.link} to={DataStorePaths.Relationships()}>
                    Test Relationships
                  </Link>
                  :
                </div>
                <div className={classes.tupleError}>
                  Invalid relationship <code>{invalid.text}</code> on line {invalid.lineNumber + 1}:{" "}
                  {invalid.parsed.errorMessage}
                </div>
              </div>
            </Paper>
          );
        },
      )}
      {services.problemService.requestErrors.map((de: DeveloperError, index: number) => {
        return (
          <Paper className={classes.errorContainer} key={`de${index}`}>
            <div>
              <DeveloperSourceDisplay error={de} />
              <DeveloperErrorDisplay error={de} />
            </div>
          </Paper>
        );
      })}
      {services.problemService.warnings.map((dw: DeveloperWarning, index: number) => {
        return (
          <Paper className={classes.errorContainer} key={`dw${index}`}>
            <div>
              <DeveloperWarningSourceDisplay warning={dw} />
              <DeveloperWarningDisplay warning={dw} />
            </div>
          </Paper>
        );
      })}
    </div>
  );
}
