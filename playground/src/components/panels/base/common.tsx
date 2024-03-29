import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import 'react-reflex/styles.css';
import { DataStore } from '../../../services/datastore';
import { Services } from '../../../services/services';

/**
 * Panel defines a single panel found in the panel display component.
 */
export interface Panel<L extends string> {
    /**
     * id is the unique ID for the panel. Must be stable across loads.
     */
    id: string

    /**
     * summary is the React tag to render for displaying the summary of the panel.
     */
    summary: (props: PanelSummaryProps<L>) => JSX.Element

    /**
     * content is the React tag to render for displaying the contents of the panel.
     */
    content: (props: PanelProps<L>) => JSX.Element
}

/**
 * PanelProps are the props passed to all panels content tags.
 */
export interface PanelProps<L extends string> {
    datastore: DataStore
    services: Services
    location: L
}

/**
 * PanelSummaryProps are the props passed to all panel summary tags.
 */
export interface PanelSummaryProps<L extends string> {
    services: Services
    location: L
}

/**
 * useSummaryStyles are common styles used by panel summary components.
 */
export const useSummaryStyles = makeStyles((theme: Theme) =>
  createStyles({
    throbber: {
      color: theme.palette.text.primary,
    },
    summaryBar: {
      display: 'grid',
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      columnGap: theme.spacing(1),
      alignItems: 'center',
    },
    badge: {
      display: 'inline-flex',
      padding: theme.spacing(0.5),
      borderRadius: '6px',
      width: '1.5em',
      height: '1.5em',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '85%',
      backgroundColor: theme.palette.divider,
      color: theme.palette.getContrastText(theme.palette.divider),
    },
    successBadge: {
      backgroundColor: theme.palette.success.dark,
      color: theme.palette.getContrastText(theme.palette.success.dark),
    },
    caveatedBadge: {
      backgroundColor: '#8787ff',
      color: theme.palette.getContrastText('#8787ff'),
    },
    invalidBadge: {
      backgroundColor: theme.palette.warning.dark,
      color: theme.palette.getContrastText(theme.palette.warning.dark),
    },
    failBadge: {
      backgroundColor: theme.palette.error.dark,
      color: theme.palette.getContrastText(theme.palette.error.dark),
    },
    checkTab: {
      display: 'grid',
      alignItems: 'center',
    },
    checkTabWithItems: {
      gridTemplateColumns: 'auto auto auto auto auto',
      columnGap: '10px',
    },
    problemTab: {
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      columnGap: '10px',
      alignItems: 'center',
    },
  })
);
