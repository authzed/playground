import { createStyles, makeStyles } from "@material-ui/core/styles";
import { SquareSplitHorizontal, SquareSplitVertical } from "lucide-react";
import { useEffect, useState, Children, isValidElement, cloneElement, type ReactNode } from "react";
import { HandlerProps, ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import "react-reflex/styles.css";

import { DataStore } from "../../../services/datastore";
import { Services } from "../../../services/services";

import { Panel } from "./common";
import { PanelDisplay, PanelSummaryBar, SUMMARY_BAR_HEIGHT } from "./components";
import { PanelsCoordinator, usePanelsCoordinator } from "./coordinator";

const HORIZONTAL_FLEX_KEY = "horizontal-flex";
const VERTICAL_FLEX_KEY = "vertical-flex";

const DEFAULT_VERTICAL_FLEX = 0.3;
const DEFAULT_HORIZONTAL_FLEX = 0;

const MINIMUM_HORIZONTAL_FLEX = 0.2;
const MINIMUM_VERTICAL_FLEX = 0.2;

const MINIMUM_HORIZONTAL_SIZE = 200;
const MINIMUM_VERTICAL_SIZE = 200;

const useStyles = makeStyles(() =>
  createStyles({
    noOverflow: {
      overflow: "hidden !important",
    },
  }),
);

interface PanelDefProps {
  panels: Panel[];
  disabled?: boolean | undefined;
  overrideSummaryDisplay?: ReactNode;
  datastore: DataStore;
  services: Services;
  children: ReactNode;
}

interface Dimensions {
  width: number;
  height: number;
}

/**
 * ReflexedPanelDisplay is a panel display component with two pre-defined panels (horizontal
 * and vertical), with the horizonal being collapsed into a summary bar when not visible, and with
 * automatic support for user-resizing.
 */
export function ReflexedPanelDisplay(props: PanelDefProps) {
  const classes = useStyles();

  const coordinator = usePanelsCoordinator({
    panels: props.panels,
    locations: {
      horizontal: {
        title: "Bottom",
        icon: <SquareSplitHorizontal />,
      },
      vertical: {
        title: "Side",
        icon: <SquareSplitVertical />,
      },
    },
    defaultLocation: "horizontal",
    autoCloseDisplayWhenEmpty: true,
  });

  const horizontalDisplayVisible = coordinator.isDisplayVisible("horizontal") && !props.disabled;

  const cachedHorizontalFlex = parseFloat(
    localStorage.getItem(HORIZONTAL_FLEX_KEY) ?? DEFAULT_HORIZONTAL_FLEX.toString(),
  );
  const [horizontalFlex, setHorizontalFlex] = useState(
    horizontalDisplayVisible ? Math.max(cachedHorizontalFlex, MINIMUM_HORIZONTAL_FLEX) : 0,
  );

  const handleHorizontalResize = (event: HandlerProps) => {
    const { flex } = event.component.props;
    if (!flex || flex < MINIMUM_HORIZONTAL_FLEX) {
      return;
    }

    setHorizontalFlex(flex!);
    localStorage.setItem(HORIZONTAL_FLEX_KEY, flex!.toString());
  };

  useEffect(() => {
    if (horizontalDisplayVisible && horizontalFlex < MINIMUM_HORIZONTAL_FLEX) {
      setHorizontalFlex(Math.max(cachedHorizontalFlex, MINIMUM_HORIZONTAL_FLEX));
    } else if (!horizontalDisplayVisible && horizontalFlex > 0) {
      setHorizontalFlex(0);
    }
  }, [horizontalFlex, horizontalDisplayVisible, cachedHorizontalFlex]);

  return (
    <div className="w-full h-full">
      <ReflexContainer orientation="horizontal" windowResizeAware={true}>
        <ReflexElement
          className={classes.noOverflow}
          flex={1 - horizontalFlex}
          propagateDimensionsRate={50}
          propagateDimensions={true}
        >
          <MainDisplayWithSummaryBar coordinator={coordinator} {...props} />
        </ReflexElement>

        {horizontalDisplayVisible && <ReflexSplitter />}

        <ReflexElement
          className={classes.noOverflow}
          flex={horizontalFlex}
          minSize={horizontalFlex > 0 ? MINIMUM_HORIZONTAL_SIZE : undefined}
          propagateDimensionsRate={50}
          propagateDimensions={true}
          onResize={handleHorizontalResize}
        >
          {horizontalDisplayVisible ? (
            <PanelDisplay
              location="horizontal"
              coordinator={coordinator}
              services={props.services}
              datastore={props.datastore}
            />
          ) : (
            <span />
          )}
        </ReflexElement>
      </ReflexContainer>
    </div>
  );
}

function MainDisplayWithSummaryBar(props: {
  coordinator: PanelsCoordinator;
  disabled?: boolean | undefined;
  children: ReactNode;
  dimensions?: Dimensions;
  datastore: DataStore;
  services: Services;
}) {
  const coordinator = props.coordinator;
  const displayVisible = coordinator.isDisplayVisible("horizontal") && !props.disabled;

  /*
   * NOTE: The comparison to window.innerHeight below ensures that we only render the
   * summary display once the height information has been propagated by the parent
   * reflex component. Otherwise, it can show an annoying briefly "flash" of the bottom
   * summary bar.
   */
  const HEIGHT_COMPARISON = 10 + 144; // 144 is the max AppBar height.
  const displaySummaryBar =
    !displayVisible &&
    coordinator.hasPanels("horizontal") &&
    window.innerHeight - (props.dimensions?.height ?? 0) < HEIGHT_COMPARISON;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MainDisplayAndVertical {...props} />
      {displaySummaryBar && <PanelSummaryBar location="horizontal" {...props} />}
    </div>
  );
}

type EnrichedChildren = {
  children?: React.ReactNode;
  dimensions?: Dimensions;
};

function MainDisplayAndVertical(props: {
  coordinator: PanelsCoordinator;
  dimensions?: Dimensions;
  children: ReactNode;
  datastore: DataStore;
  services: Services;
}) {
  const classes = useStyles();

  const coordinator = props.coordinator;
  const verticalDisplayVisible = coordinator.isDisplayVisible("vertical");
  const horizontalDisplayVisible = coordinator.isDisplayVisible("horizontal");

  const cachedVerticalFlex = parseFloat(
    localStorage.getItem(VERTICAL_FLEX_KEY) ?? DEFAULT_VERTICAL_FLEX.toString(),
  );
  const [verticalFlex, setVerticalFlex] = useState(
    verticalDisplayVisible ? Math.max(cachedVerticalFlex, MINIMUM_VERTICAL_FLEX) : 0,
  );

  useEffect(() => {
    if (verticalDisplayVisible && verticalFlex < MINIMUM_VERTICAL_FLEX) {
      setVerticalFlex(Math.max(cachedVerticalFlex, MINIMUM_VERTICAL_FLEX));
    } else if (!verticalDisplayVisible && verticalFlex > 0) {
      setVerticalFlex(0);
    }
  }, [verticalFlex, verticalDisplayVisible, cachedVerticalFlex]);

  const handleVerticalResize = (event: HandlerProps) => {
    const { flex } = event.component.props;
    if (!flex || flex < MINIMUM_VERTICAL_FLEX) {
      return;
    }

    setVerticalFlex(flex!);
    localStorage.setItem(VERTICAL_FLEX_KEY, flex!.toString());
  };

  const contentHeight =
    horizontalDisplayVisible || !coordinator.hasPanels("horizontal")
      ? (props.dimensions?.height ?? 0)
      : (props.dimensions?.height ?? 0) - SUMMARY_BAR_HEIGHT;
  const contentDimensions: Dimensions | undefined = props.dimensions
    ? { width: props.dimensions.width, height: contentHeight }
    : undefined;

  const adjustedChildren = Children.map(props.children, (child) => {
    // Based on: https://stackoverflow.com/a/55486160
    if (!isValidElement<EnrichedChildren>(child)) {
      return child;
    }

    const elementChild: React.ReactElement<EnrichedChildren> = child;
    return cloneElement(elementChild, { dimensions: contentDimensions, ...child.props }, null);
  });

  return (
    <div style={{ height: contentHeight || "100%" }}>
      <ReflexContainer orientation="vertical" windowResizeAware={true}>
        <ReflexElement
          className={classes.noOverflow}
          flex={1 - verticalFlex}
          minSize={400}
          propagateDimensionsRate={200}
          propagateDimensions={true}
        >
          {adjustedChildren}
        </ReflexElement>

        {verticalDisplayVisible && <ReflexSplitter />}

        <ReflexElement
          className={classes.noOverflow}
          flex={verticalFlex}
          minSize={verticalFlex > 0 ? MINIMUM_VERTICAL_SIZE : undefined}
          propagateDimensionsRate={200}
          propagateDimensions={true}
          onResize={handleVerticalResize}
        >
          <PanelDisplay
            location="vertical"
            coordinator={coordinator}
            services={props.services}
            datastore={props.datastore}
          />
        </ReflexElement>
      </ReflexContainer>
    </div>
  );
}
