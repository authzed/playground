import { Paper } from "@material-ui/core";
import CircularProgress from "@material-ui/core/CircularProgress";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import PlaylistAddCheckIcon from "@material-ui/icons/PlaylistAddCheck";
import clsx from "clsx";
import "react-reflex/styles.css";
import { useTheme } from "@material-ui/core/styles";

import TabLabel from "../../playground-ui/TabLabel";
import { DeveloperError } from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { ValidationStatus } from "@/store/validationSlice";

import { DeveloperErrorDisplay, DeveloperSourceDisplay } from "./errordisplays";
import { useAppSelector } from "@/hooks";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    apiOutput: {
      fontFamily: "Roboto Mono, monospace",
      padding: theme.spacing(2),
    },
    notRun: {
      color: theme.palette.grey[500],
    },
    validationErrorContainer: {
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  }),
);

export function ValidationSummary() {
  const status = useAppSelector(state => state.validation.status)
  const theme = useTheme()
  const validationStatusColor = {
    [ValidationStatus.NOT_RUN]: "grey",
    [ValidationStatus.CALL_ERROR]: "grey",
    [ValidationStatus.RUNNING]: "white",
    [ValidationStatus.VALIDATED]: theme.palette.success.main,
    [ValidationStatus.VALIDATION_ERROR]: theme.palette.error.main,
  }[status];
  return (
    <TabLabel
      icon={
        <PlaylistAddCheckIcon htmlColor={validationStatusColor} />
      }
      title="Last Validation Run"
    />
  );
}

export function ValidationPanel() {
  const classes = useStyles();
  const status = useAppSelector(state => state.validation.status)
  const validationErrors = useAppSelector(state => state.validation.validationErrors)

  return (
    <div
      className={clsx(classes.apiOutput, {
        [classes.notRun]: status === ValidationStatus.NOT_RUN,
      })}
    >
      {status === ValidationStatus.NOT_RUN && <span>Validation Not Run</span>}
      {status === ValidationStatus.CALL_ERROR && (
        <span>Validation Call Failed. Please try again shortly.</span>
      )}
      {status === ValidationStatus.RUNNING && <CircularProgress />}
      {status === ValidationStatus.VALIDATED && (
        <span>Validation Completed Successfully!</span>
      )}
      {status === ValidationStatus.VALIDATION_ERROR && (
        <span>
          {validationErrors?.map((de: DeveloperError, index: number) => {
            return (
              <Paper className={classes.validationErrorContainer} key={index}>
                <DeveloperSourceDisplay error={de} />
                <DeveloperErrorDisplay error={de} />
              </Paper>
            );
          })}
        </span>
      )}
    </div>
  );
}
