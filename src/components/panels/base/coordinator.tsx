import { useState } from "react";
import { Panel } from "./common";

/**
 * LocationData is a location and its metadata.
 */
export interface LocationData<L> {
    location: L
    metadata: PanelLocation
}

/**
 * PanelsCoordinator defines the interface for the panels coordinator.
 */
export interface PanelsCoordinator<L extends string> {
    /**
     * panelsInLocation returns all panels found in a specific location.
     */
    panelsInLocation: (location: L) => Panel<L>[];

    /**
     * showPanel displays that panel, moving it to the correct location if necessary.
     */
    showPanel: (panel: Panel<L>, location: L) => void;

    /**
     * getActivePanel returns the active panel in a specific location.
     */
    getActivePanel: (location: L) => Panel<L> | undefined;

    /**
     * setActivePanel sets the active panel for a location. Moves the panel to the location
     * if necessary.
     */
    setActivePanel: (panelId: string, location: L) => void;

    /**
     * isDisplayVisible returns true if the display for a specific location is currently
     * visible.
     */
    isDisplayVisible: (location: L) => boolean;

    /**
     * closeDisplay marks a display location as collapsed.
     */
    closeDisplay: (location: L) => void;

    /**
     * hasPanels returns true if the specified location has any panels.
     */
    hasPanels: (location: L) => boolean;

    /**
     * listLocations lists all the locations defined.
     */
    listLocations: () => LocationData<L>[];
}

/**
 * PanelLocation defines a location for a panel.
 */
export interface PanelLocation {
    /**
     * title is the human-readable title for the location.
     */
    title: string

    /**
     * icon is the icon to render for this location.
     */
    icon: React.ReactNode
}

export interface PanelCoordinatorProps<L extends string> {
    /**
     * panels are the panels defined.
     */
    panels: Panel<L>[]

    /**
     * locations are the locations defined.
     */
    locations: Record<L, PanelLocation>

    /**
     * defaultLocation is the location in which to place panels by default.
     */
    defaultLocation: L

    /**
     * autoCloseDisplayWhenEmpty, if true, specifes that a display should be closed
     * when it becomes empty.
     */
    autoCloseDisplayWhenEmpty?: boolean
}

interface CoordinatorState<L extends string> {
    panelLocations: Record<string, L>
    displaysVisible: Record<L, boolean>
    activeTabs: Record<L, string>
}

const COORDINATOR_STATE_KEY = 'panel-coordinator-state';

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
export function usePanelsCoordinator<L extends string>(props: PanelCoordinatorProps<L>): PanelsCoordinator<L> {
    const [coordinatorState, internalSetCoordinatorState] = useState<CoordinatorState<L>>(() => {
        // Try to parse from local storage.
        try {
            const foundState = JSON.parse(localStorage.getItem(COORDINATOR_STATE_KEY) ?? '');
            if ('panelLocations' in foundState && 'displaysVisible' in foundState && 'activeTabs' in foundState) {
                if (Object.keys(foundState.panelLocations).length === props.panels.length) {
                    return foundState;
                }
            }
        } catch (e) {
            // Do nothing.
            console.error(e)
        }

        const locations: Record<string, L> = {};
        props.panels.forEach((panel: Panel<L>) => {
            locations[panel.id] = props.defaultLocation;
        });

        const displays: Record<L, boolean> = {} as Record<L, boolean>;
        Object.keys(props.locations).forEach((locationStr: string) => {
            displays[(locationStr as unknown) as L] = false;
        });

        return {
            panelLocations: locations,
            displaysVisible: displays,
            activeTabs: {} as Record<L, string>,
        }
    });

    const setCoordinatorStateAndSave = (state: CoordinatorState<L>) => {
        internalSetCoordinatorState(state);
        localStorage.setItem(COORDINATOR_STATE_KEY, JSON.stringify(state));
    };

    const panelsInLocation = (location: L, state?: CoordinatorState<L>) => {
        const checkState = state ?? coordinatorState;
        return props.panels.filter((panel: Panel<L>) => {
            return checkState.panelLocations[panel.id] === location;
        });
    };

    const showPanel = (panel: Panel<L>, location: L) => {
        setActivePanel(panel.id, location);
    };

    const getActivePanel = (location: L) => {
        const allowedPanels = panelsInLocation(location);
        return allowedPanels.find((panel: Panel<L>) => panel.id === coordinatorState.activeTabs[location]);
    };

    const setActivePanel = (panelId: string, location: L) => {
        let updatedState = {
            ...coordinatorState
        };

        const existingLocation = coordinatorState.panelLocations[panelId];
        if (existingLocation !== location) {
            // Update the active tab for the location.
            const active = getActivePanel(existingLocation);
            if (active?.id === panelId) {
                const panels = panelsInLocation(existingLocation).filter((found: Panel<L>) => found.id !== panelId);
                if (panels.length) {
                    updatedState = {
                        ...updatedState,
                        activeTabs: {
                            ...updatedState.activeTabs,
                            [existingLocation]: panels[0].id
                        }
                    }
                } else {
                    updatedState = {
                        ...updatedState,
                        activeTabs: {
                            ...updatedState.activeTabs,
                            [existingLocation]: undefined
                        }
                    }
                }
            }

            updatedState = {
                ...updatedState,
                panelLocations: {
                    ...updatedState.panelLocations,
                    [panelId]: location
                }
            }

            // Check for auto-close.
            if (props.autoCloseDisplayWhenEmpty === true) {
                Object.keys(props.locations).forEach((locationStr: string) => {
                    const location = locationStr as L;
                    if (!panelsInLocation(location, updatedState).length) {
                        updatedState = {
                            ...updatedState,
                            displaysVisible: {
                                ...coordinatorState.displaysVisible,
                                [location]: false,
                            }
                        };
                    }
                });
            }
        }

        updatedState = {
            ...updatedState,
            activeTabs: {
                ...updatedState.activeTabs,
                [location]: panelId
            }
        }

        if (!isDisplayVisible(location)) {
            updatedState = {
                ...updatedState,
                displaysVisible: {
                    ...updatedState.displaysVisible,
                    [location]: true,
                }
            }
        }

        setCoordinatorStateAndSave(updatedState);
    };

    const closeDisplay = (location: L) => {
        let updatedState = {
            ...coordinatorState,
            displaysVisible: {
                ...coordinatorState.displaysVisible,
                [location]: false,
            }
        };

        const updatedLocations = { ...updatedState.panelLocations };
        Object.keys(coordinatorState.panelLocations).forEach((panelId: string) => {
            if (coordinatorState.panelLocations[panelId] === location) {
                updatedLocations[panelId] = props.defaultLocation;
            }
        });

        updatedState = {
            ...updatedState,
            panelLocations: updatedLocations
        };

        setCoordinatorStateAndSave(updatedState);
    };

    const isDisplayVisible = (location: L) => {
        return coordinatorState.displaysVisible[location];
    };

    const hasPanels = (location: L) => {
        return panelsInLocation(location).length > 0;
    };

    const listLocations = () => {
        return Object.keys(props.locations).map((locationStr: string) => {
            const locationKey = locationStr as L;
            return {
                location: locationKey,
                metadata: props.locations[locationKey],
            }
        });
    };

    return {
        panelsInLocation: panelsInLocation,
        hasPanels: hasPanels,
        showPanel: showPanel,
        getActivePanel: getActivePanel,
        setActivePanel: setActivePanel,
        closeDisplay: closeDisplay,
        isDisplayVisible: isDisplayVisible,
        listLocations: listLocations,
    };
}
