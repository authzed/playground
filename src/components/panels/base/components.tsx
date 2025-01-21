import TabPanel from '../../../playground-ui/TabPanel';
import { Button, Tooltip, Typography } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Toolbar from '@material-ui/core/Toolbar';
import { Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import React, { useCallback } from 'react';
import { DataStore } from '../../../services/datastore';
import { Services } from '../../../services/services';
import { Panel, useSummaryStyles } from './common';
import { LocationData, PanelsCoordinator } from './coordinator';

export const SUMMARY_BAR_HEIGHT = 48; // Pixels

/**
 * PanelSummaryBar is the summary bar displayed when a panel display is closed.
 */
export function PanelSummaryBar<L extends string>(props: {
  location: L;
  coordinator: PanelsCoordinator<L>;
  services: Services;
  disabled?: boolean | undefined;
  overrideSummaryDisplay?: React.ReactChild;
}) {
  const classes = useSummaryStyles();

  const coordinator = props.coordinator;
  const panels =
    props.overrideSummaryDisplay === undefined
      ? coordinator.panelsInLocation(props.location)
      : [];

  return (
    <AppBar position="relative" color="default">
      <Toolbar
        className={classes.summaryBar}
        style={{
          gridTemplateColumns: `${panels
            .map((panel: Panel<L>) => 'auto')
            .join(' ')} 1fr auto`,
        }}
        variant="dense"
      >
        {props.overrideSummaryDisplay !== undefined &&
          props.overrideSummaryDisplay}
        {panels.map((panel: Panel<L>) => {
          // NOTE: Using this as a tag here is important for React's state system. Otherwise,
          // it'll run hooks outside of the normal flow, which breaks things.
          const Summary = panel.summary;
          return (
            <Button
              key={panel.id}
              disabled={!!props.disabled}
              onClick={() => coordinator.showPanel(panel, props.location)}
            >
              <Summary {...props} />
            </Button>
          );
        })}
        <span />
        <span>
          {props.services.problemService.isUpdating && (
            <CircularProgress className={classes.throbber} size="26px" />
          )}
        </span>
      </Toolbar>
    </AppBar>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    validationToolBar: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      width: '100%',
      padding: 0,
      paddingRight: theme.spacing(1),
    },
    apiOutput: {
      fontFamily: 'Roboto Mono, monospace',
      padding: theme.spacing(2),
    },
    tabContent: {
      overflow: 'auto',
      borderRadius: 0,
      height: '100%',
    },
    notRun: {
      color: theme.palette.grey[500],
    },
    link: {
      color: theme.palette.text.primary,
    },
    validationErrorContainer: {
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    validationErrorContext: {
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.default,
    },
    noPanels: {
      padding: theme.spacing(2),
      textAlign: 'center',
    },
  })
);

const TOOLBAR_HEIGHT = 48; // Pixels

/**
 * PanelDisplay displays the panels in a specific location.
 */
export function PanelDisplay<L extends string>(
  props: {
    location: L;
    coordinator: PanelsCoordinator<L>;
    datastore: DataStore;
    services: Services;
  } & {
    dimensions?: { width: number; height: number };
  }
) {
  const classes = useStyles();
  const coordinator = props.coordinator;

  const currentTabName = coordinator.getActivePanel(props.location)?.id || '';

  const handleChangeTab = useCallback(
    (event: React.ChangeEvent<{}>, selectedPanelId: string) => {
      coordinator.setActivePanel(selectedPanelId, props.location);
    },
    [coordinator, props.location]
  );

  const panels = coordinator.panelsInLocation(props.location);
  const adjustedDimensions = props.dimensions
    ? {
        width: props.dimensions.width,
        height: props.dimensions.height - TOOLBAR_HEIGHT,
      }
    : undefined;

  const contentProps = {
    ...props,
    dimensions: adjustedDimensions,
  };

  return (
    <div>
      <AppBar position="static" color="default">
        <Toolbar className={classes.validationToolBar} variant="dense">
          <Tabs
            value={currentTabName}
            onChange={handleChangeTab}
            aria-label="Tabs"
            variant="fullWidth"
          >
            {panels.map((panel: Panel<L>) => {
              // NOTE: Using this as a tag here is important for React's state system. Otherwise,
              // it'll run hooks outside of the normal flow, which breaks things.
              const Summary = panel.summary;
              return (
                <Tab
                  key={`tab-${panel.id}`}
                  value={panel.id}
                  label={<Summary {...props} />}
                />
              );
            })}
          </Tabs>

          <span>
            {currentTabName &&
              coordinator.listLocations().map((locData: LocationData<L>) => {
                if (locData.location === props.location) {
                  return <div key={locData.location} />;
                }
                return (
                  <Tooltip
                    key={locData.location}
                    title={`Move to ${locData.metadata.title}`}
                  >
                    <IconButton
                      size="small"
                      edge="start"
                      color="inherit"
                      aria-label="move"
                      onClick={() =>
                        coordinator.showPanel(
                          coordinator.getActivePanel(props.location)!,
                          locData.location
                        )
                      }
                    >
                      {locData.metadata.icon}
                    </IconButton>
                  </Tooltip>
                );
              })}
          </span>

          <IconButton
            size="small"
            edge="start"
            color="inherit"
            aria-label="close"
            onClick={() => coordinator.closeDisplay(props.location)}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {panels.map((panel: Panel<L>) => {
        // NOTE: Using this as a tag here is important for React's state system. Otherwise,
        // it'll run hooks outside of the normal flow, which breaks things.
        const Content = panel.content;
        const height =
          props.dimensions?.height ?? 0 >= 48
            ? (props.dimensions?.height ?? 0) - 48
            : 'auto';

        return (
          <TabPanel
            key={`panel-${panel.id}`}
            index={panel.id}
            value={currentTabName}
            style={{
              overflow: 'auto',
              height: height || 'auto',
              position: 'relative',
            }}
          >
            {currentTabName === panel.id && <Content {...contentProps} />}
          </TabPanel>
        );
      })}

      {panels.length === 0 && (
        <Typography className={classes.noPanels} color="textSecondary">
          No Panels are attached here
        </Typography>
      )}
    </div>
  );
}
