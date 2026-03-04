import { Theme, createStyles, makeStyles } from "@material-ui/core/styles";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type ReactNode } from "react";
import { Loader, X } from "lucide-react";

import { DataStore } from "../../../services/datastore";
import { Services } from "../../../services/services";
import { ReflexedPanelLocation } from "../types";

import { Panel } from "./common";
import { LocationData, PanelsCoordinator } from "./coordinator";

export const SUMMARY_BAR_HEIGHT = 48; // Pixels

/**
 * PanelSummaryBar is the summary bar displayed when a panel display is closed.
 */
export function PanelSummaryBar({
  coordinator,
  overrideSummaryDisplay,
  location,
  services,
  disabled,
}: {
  location: ReflexedPanelLocation;
  coordinator: PanelsCoordinator;
  services: Services;
  disabled?: boolean;
  overrideSummaryDisplay?: ReactNode;
}) {
  const currentTabName = coordinator.getActivePanel(location)?.id || "";

  return (
      <ToggleGroup type="single"
      value={currentTabName}
      className="justify-between"
      >
        {overrideSummaryDisplay ?? coordinator.panelsInLocation(location).map((panel: Panel) => {
          // NOTE: Using this as a tag here is important for React's state system. Otherwise,
          // it'll run hooks outside of the normal flow, which breaks things.
          const Summary = panel.Summary;
          return (
            <ToggleGroupItem
              key={panel.id}
              value={panel.id}
              disabled={disabled}
              onClick={() => coordinator.showPanel(panel, location)}
            >
              <Summary 
              location={location}
              services={services}
              />
            </ToggleGroupItem>
          );
        })}
        {/* TODO: this feels like a hack */}
        <span />
        <span>
          {services.problemService.isUpdating && (
            <Loader size="26px" />
          )}
            <Loader size="26px" />
        </span>
        </ToggleGroup>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    noPanels: {
      padding: theme.spacing(2),
      textAlign: "center",
    },
  }),
);

/**
 * PanelDisplay displays the panels in a specific location.
 */
export function PanelDisplay({
  location,
  coordinator,
  datastore,
  services,
  dimensions,
}: {
  location: ReflexedPanelLocation;
  coordinator: PanelsCoordinator;
  datastore: DataStore;
  services: Services;
  dimensions?: { width: number; height: number };
}) {
  const classes = useStyles();

  const currentTabName = coordinator.getActivePanel(location)?.id || "";

  const panels = coordinator.panelsInLocation(location);
  return (
    <>
          <Tabs
            value={currentTabName}
            onValueChange={(selectedPanelId: string) => {
              coordinator.setActivePanel(selectedPanelId, location);
            }}
          >
          <TabsList
          className="w-full"
          variant="line"
          >
            {panels.map(({ id, Summary }: Panel) => (
              <TabsTrigger key={id} value={id}>
              {/*
              NOTE: Using this as a tag here is important for React's state system. Otherwise,
              it'll run hooks outside of the normal flow, which breaks things.
              */}
              <Summary
              services={services}
              location={location}
              />
              </TabsTrigger>
            ))}
            <TabControls location={location} coordinator={coordinator} />
          </TabsList>
      {panels.map(({ id, Content }: Panel) => {
        // NOTE: Using this as a tag here is important for React's state system. Otherwise,
        // it'll run hooks outside of the normal flow, which breaks things.
        const height =
          (dimensions?.height ?? 0 >= 48) ? (dimensions?.height ?? 0) - 48 : "auto";

        return (
          <TabsContent
            key={id}
            value={id}
            className="overflow-auto relative"
            style={{ height: height }}
          >
          {/* NOTE: we conditionally render here because we don't actually want to
            have all of the panels mounted all of the time. */}
            {currentTabName === id && <Content
              datastore={datastore}
              services={services}
              location={location}
              />}
          </TabsContent>
        );
      })}
          </Tabs>

          <div className="absolute right-0 top-0">
          {/* TODO: reposition this as outside of the tab flow */}
          </div>

      {panels.length === 0 && (
        // TODO: style here
        <span className={classes.noPanels}>
          No Panels are attached here
        </span>
      )}
    </>
  );
}

const TabControls = ({ coordinator, location }: { coordinator: PanelsCoordinator, location: ReflexedPanelLocation}) => {
  const currentTabName = coordinator.getActivePanel(location)?.id || "";
  return (
    <>
            {currentTabName &&
              // TODO: this is probably unnecessarily complicated. there's two locations.
              coordinator.listLocations().map((locData: LocationData) => {
                if (locData.location === location) {
                  return null;
                }
                return (
                  // TODO: this is wrong for whatever reason.
                  <Tooltip key={locData.location}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      aria-label="move"
                      variant="ghost"
                      onClick={() =>
                        coordinator.showPanel(
                          coordinator.getActivePanel(location)!,
                          locData.location,
                        )
                      }
                    >
                      {locData.metadata.icon}
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move to {locData.metadata.title}</TooltipContent>
                  </Tooltip>
                );
              })}

          <Button
            size="sm"
            variant="ghost"
            aria-label="close"
            onClick={() => coordinator.closeDisplay(location)}
          >
            <X />
          </Button>
          </>
  )
}
