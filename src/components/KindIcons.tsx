import { faDatabase } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import WarningIcon from "@material-ui/icons/Warning";
import "react-reflex/styles.css";

interface StyleProps {
  small?: boolean;
}

const useStyles = makeStyles(() =>
  createStyles({
    ns: {
      fontFamily: "Roboto Mono, monospace",
      color: "#8787ff",
      fontSize: (props: StyleProps) => (props.small ? "85%" : "125%"),
      fontWeight: "bold",
    },
    vl: {
      fontFamily: "Roboto Mono, monospace",
      color: "#87deff",
      fontSize: (props: StyleProps) => (props.small ? "85%" : "125%"),
      fontWeight: "bold",
    },
    at: {
      fontFamily: "Roboto Mono, monospace",
      "& svg": {
        color: "orange",
        fontSize: (props: StyleProps) => (props.small ? "85%" : "125%"),
      },
      fontWeight: "bold",
    },
    et: {
      fontFamily: "Roboto Mono, monospace",
      color: "#3dc9b0",
      fontSize: (props: StyleProps) => (props.small ? "85%" : "125%"),
      fontWeight: "bold",
    },
  }),
);

export function NS(props: { small?: boolean }) {
  const classes = useStyles(props);
  return <span className={classes.ns}>DEF</span>;
}

export function VL(props: { small?: boolean }) {
  const classes = useStyles(props);
  return (
    <span className={classes.vl}>
      <FontAwesomeIcon icon={faDatabase} />
    </span>
  );
}

export function AT(props: { small?: boolean }) {
  const classes = useStyles(props);
  return (
    <span className={classes.at}>
      <WarningIcon />
    </span>
  );
}

export function ET(props: { small?: boolean }) {
  const classes = useStyles(props);
  return <span className={classes.et}>[]</span>;
}
