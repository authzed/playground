import CircularProgress from "@material-ui/core/CircularProgress";
import Paper from "@material-ui/core/Paper";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import type { ReactNode } from "react";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      top: "0px",
      left: "0px",
      right: "0px",
      bottom: "0px",
      zIndex: 9999,
    },
    paper: {
      padding: theme.spacing(3),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    throbber: {
      color: theme.palette.primary.light,
      marginRight: "1rem",
    },
  }),
);

/**
 * LoadingView displays a full page throbber and message for loading.
 * @param props The properties for the loading view.
 */
export default function LoadingView({ message }: { message: ReactNode }) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        <CircularProgress className={classes.throbber} />
        <Typography>{message}</Typography>
      </Paper>
    </div>
  );
}
