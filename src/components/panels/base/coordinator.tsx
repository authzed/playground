import { useState } from "react";
import z from "zod";

import { panelLocations, type ReflexedPanelLocation } from "../types";

import { Panel } from "./common";

/**
 * LocationData is a location and its metadata.
 */
export interface LocationData {
  location: ReflexedPanelLocation;
  metadata: PanelLocation;
}

/**
 * PanelsCoordinator defines the interface for the panels coordinator.
 */
export interface PanelsCoordinator {
  /**
   * panelsInLocation returns all panels found in a specific location.
   */
  panelsInLocation: (location: ReflexedPanelLocation) => Panel[];

  /**
   * showPanel displays that panel, moving it to the correct location if necessary.
   */
  showPanel: (panel: Panel, location: ReflexedPanelLocation) => void;

  /**
   * getActivePanel returns the active panel in a specific location.
   */
  getActivePanel: (location: ReflexedPanelLocation) => Panel | undefined;

  /**
   * setActivePanel sets the active panel for a location. Moves the panel to the location
   * if necessary.
   */
  setActivePanel: (panelId: string, location: ReflexedPanelLocation) => void;

  /**
   * isDisplayVisible returns true if the display for a specific location is currently
   * visible.
   */
  isDisplayVisible: (location: ReflexedPanelLocation) => boolean;

  /**
   * closeDisplay marks a display location as collapsed.
   */
  closeDisplay: (location: ReflexedPanelLocation) => void;

  /**
   * hasPanels returns true if the specified location has any panels.
   */
  hasPanels: (location: ReflexedPanelLocation) => boolean;

  /**
   * listLocations lists all the locations defined.
   */
  listLocations: () => LocationData[];
}

/**
 * PanelLocation defines a location for a panel.
 */
export interface PanelLocation {
  /**
   * title is the human-readable title for the location.
   */
  title: string;

  /**
   * icon is the icon to render for this location.
   */
  icon: React.ReactNode;
}

export interface PanelCoordinatorProps {
  /**
   * panels are the panels defined.
   */
  panels: Panel[];

  /**
   * locations are the locations defined.
   */
  locations: Record<ReflexedPanelLocation, PanelLocation>;

  /**
   * defaultLocation is the location in which to place panels by default.
   */
  defaultLocation: ReflexedPanelLocation;

  /**
   * autoCloseDisplayWhenEmpty, if true, specifes that a display should be closed
   * when it becomes empty.
   */
  autoCloseDisplayWhenEmpty?: boolean;
}

const reflexedPanelLocation = z.union([z.literal("horizontal"), z.literal("vertical")]);

const CoordinatorState = z.object({
  panelLocations: z.record(z.string(), reflexedPanelLocation),
  displaysVisible: z.record(reflexedPanelLocation, z.boolean()),
  activeTabs: z.partialRecord(reflexedPanelLocation, z.string()),
});

type CoordinatorStateType = z.infer<typeof CoordinatorState>;

const COORDINATOR_STATE_KEY = "panel-coordinator-state";

/**
 * usePanelsCoordinator creates a coordinator for user with PanelsDisplay's and PanelsSummaryBar's.
 * 
 * Example:
 
 ```
    enum SomeLocationEnum {
        FIRST = 'first',
        SECOND = 'second',
        THIRD = 'third',
    }

    const panels: Panel<SomeLocationEnum>[] = [
        {
            id: 'foo',
            summary: FooSummary,
            content: FooPanel,
        },
        {
            id: 'bar',
            summary: BarSummary,
            content: BarPanel,
        },
    ];

    const coordinator = usePanelsCoordinator<SomeLocationEnum>({
        panels: props.panels,
        locations: {
            [SomeLocationEnum.FIRST]: {
                title: 'First',
                icon: <HorizontalSplitIcon />
            },
            [ReflexedPanelLocation.SECOND]: {
                title: 'Second',
                icon: <HorizontalSplitIcon />
            },
            [ReflexedPanelLocation.THIRD]: {
                title: 'Special Panel',
                icon: <HorizontalSplitIcon />
            }
        },
        defaultLocation: SomeLocationEnum.THIRD
    });

    <PanelDisplay<SomeLocationEnum>
        location={ReflexedPanelLocation.FIRST}
        coordinator={coordinator}
        services={props.services}
        datastore={props.datastore} />
  ```
 */
export function usePanelsCoordinator(props: PanelCoordinatorProps): PanelsCoordinator {
  const [coordinatorState, internalSetCoordinatorState] = useState<
    z.infer<typeof CoordinatorState>
  >(() => {
    // Try to parse from local storage.
    try {
      const foundState = JSON.parse(localStorage.getItem(COORDINATOR_STATE_KEY) ?? "");
      // This will throw an error if the state can't be parsed properly.
      const parsed = CoordinatorState.parse(foundState);
      if (
        // Check that the number of panel locations matches the panels we've got
        Object.keys(parsed.panelLocations).length === props.panels.length
      ) {
        return parsed;
      }
    } catch (e) {
      // Do nothing.
      console.error(e);
    }

    const locations: Record<string, ReflexedPanelLocation> = {};
    props.panels.forEach((panel: Panel) => {
      locations[panel.id] = props.defaultLocation;
    });

    return {
      panelLocations: locations,
      displaysVisible: {
        horizontal: false,
        vertical: false,
      },
      activeTabs: {},
    };
  });

  const setCoordinatorStateAndSave = (state: CoordinatorStateType) => {
    internalSetCoordinatorState(state);
    localStorage.setItem(COORDINATOR_STATE_KEY, JSON.stringify(state));
  };

  const panelsInLocation = (location: ReflexedPanelLocation, state?: CoordinatorStateType) => {
    const checkState = state ?? coordinatorState;
    return props.panels.filter((panel: Panel) => {
      return checkState.panelLocations[panel.id] === location;
    });
  };

  const showPanel = (panel: Panel, location: ReflexedPanelLocation) => {
    setActivePanel(panel.id, location);
  };

  const getActivePanel = (location: ReflexedPanelLocation) => {
    const allowedPanels = panelsInLocation(location);
    return allowedPanels.find((panel: Panel) => panel.id === coordinatorState.activeTabs[location]);
  };

  const setActivePanel = (panelId: string, location: ReflexedPanelLocation) => {
    let updatedState = {
      ...coordinatorState,
    };

    const existingLocation = coordinatorState.panelLocations[panelId];
    if (existingLocation !== location) {
      // Update the active tab for the location.
      const active = getActivePanel(existingLocation);
      if (active?.id === panelId) {
        const panels = panelsInLocation(existingLocation).filter(
          (found: Panel) => found.id !== panelId,
        );
        if (panels.length) {
          updatedState = {
            ...updatedState,
            activeTabs: {
              ...updatedState.activeTabs,
              [existingLocation]: panels[0].id,
            },
          };
        } else {
          updatedState = {
            ...updatedState,
            activeTabs: {
              ...updatedState.activeTabs,
              [existingLocation]: undefined,
            },
          };
        }
      }

      updatedState = {
        ...updatedState,
        panelLocations: {
          ...updatedState.panelLocations,
          [panelId]: location,
        },
      };

      // Check for auto-close.
      if (props.autoCloseDisplayWhenEmpty === true) {
        panelLocations.forEach((location) => {
          if (!panelsInLocation(location, updatedState).length) {
            updatedState = {
              ...updatedState,
              displaysVisible: {
                ...coordinatorState.displaysVisible,
                [location]: false,
              },
            };
          }
        });
      }
    }

    updatedState = {
      ...updatedState,
      activeTabs: {
        ...updatedState.activeTabs,
        [location]: panelId,
      },
    };

    if (!isDisplayVisible(location)) {
      updatedState = {
        ...updatedState,
        displaysVisible: {
          ...updatedState.displaysVisible,
          [location]: true,
        },
      };
    }

    setCoordinatorStateAndSave(updatedState);
  };

  const closeDisplay = (location: ReflexedPanelLocation) => {
    let updatedState = {
      ...coordinatorState,
      displaysVisible: {
        ...coordinatorState.displaysVisible,
        [location]: false,
      },
    };

    const updatedLocations = { ...updatedState.panelLocations };
    Object.keys(coordinatorState.panelLocations).forEach((panelId: string) => {
      if (coordinatorState.panelLocations[panelId] === location) {
        updatedLocations[panelId] = props.defaultLocation;
      }
    });

    updatedState = {
      ...updatedState,
      panelLocations: updatedLocations,
    };

    setCoordinatorStateAndSave(updatedState);
  };

  const isDisplayVisible = (location: ReflexedPanelLocation) => {
    return coordinatorState.displaysVisible[location];
  };

  const hasPanels = (location: ReflexedPanelLocation) => {
    return panelsInLocation(location).length > 0;
  };

  const listLocations = () => {
    return panelLocations.map((location) => {
      return {
        location,
        metadata: props.locations[location],
      };
    });
  };

  return {
    panelsInLocation,
    hasPanels,
    showPanel,
    getActivePanel,
    setActivePanel,
    closeDisplay,
    isDisplayVisible,
    listLocations,
  };
}
