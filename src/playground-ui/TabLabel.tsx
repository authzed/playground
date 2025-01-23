import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import React from "react";

/**
 * Defines the properties for the tab label.
 */
export interface TabLabelProps {
  icon: React.ReactNode;
  title: string;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tabLabel: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    tabIcon: {
      display: "inherit",
    },
    title: {
      display: "inline-block",
      marginLeft: theme.spacing(1),
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  }),
);

/**
 * TabLabel defines a well-styled label for tabs.
 * @param props The props for the TabelLabel.
 * @example <Tab label={<TabLabel icon={<GroupWork />} title="Groups" />} />
 */
export default function TabLabel(props: TabLabelProps) {
  const classes = useStyles();
  return (
    <span className={classes.tabLabel}>
      <span className={classes.tabIcon}>{props.icon}</span>
      <span className={classes.title}>{props.title}</span>
    </span>
  );
}
